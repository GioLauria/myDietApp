import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DietService, AnalyticsWeekSetting, Food, MealPlanSaveRequest } from '../../services/diet';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FoodDetailsDialog } from '../food-details/food-details';

@Component({
  selector: 'app-meal-plan',
  imports: [CommonModule, MatListModule, MatCardModule, MatButtonModule],
  templateUrl: './meal-plan.html',
  styleUrl: './meal-plan.scss',
})
export class MealPlan implements OnInit {
  private dietService = inject(DietService);
  mealTypes = signal<{ ID: number; Meal: string }[]>([]);
  // Map of category name (lowercase) -> ID populated on init
  private categoryNameToId = signal<Record<string, number>>({});
  private dialog = inject(MatDialog);
   readonly slotDefinitions = [
    { name: 'Breakfast', share: 0.20, isMain: true },
    { name: 'Snack 1', share: 0.10, isMain: false },
    { name: 'Lunch', share: 0.25, isMain: true },
    { name: 'Snack 2', share: 0.10, isMain: false },
    { name: 'Dinner', share: 0.25, isMain: true },
    { name: 'Snack 3', share: 0.10, isMain: false },
  ];

  private analyticsWeeks = signal<AnalyticsWeekSetting[] | null>(null);
  analyticsError = signal<string | null>(null);

  generatedPlan = signal<{
    slot: string;
    food: Food;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[] | null>(null);
  generatedTotals = signal<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    kcalErrorPct: number;
    proteinErrorPct?: number;
    carbsErrorPct?: number;
    fatErrorPct?: number;
  } | null>(null);

  // UI / flow signals
  generating = signal<boolean>(false);
  saving = signal<boolean>(false);
  generateError = signal<string | null>(null);
  saveStatus = signal<string | null>(null);

  // Group generated plan by slot for table rendering
  groupedPlan = computed(() => {
    const plan = this.generatedPlan();
    if (!plan) return [] as { slot: string; items: any[] }[];
    return this.slotDefinitions
      .map(def => ({ slot: def.name, items: plan.filter(item => item.slot === def.name) }))
      .filter(group => group.items.length > 0);
  });

  currentWeekSummary() {
    const weeks = this.analyticsWeeks();
    if (!weeks || !weeks.length) return null;
    // pick the most recent week by WeekStart
    const sorted = [...weeks].sort((a, b) => new Date(b.WeekStart).getTime() - new Date(a.WeekStart).getTime());
    const w = sorted[0];
    return {
      weekNumber: w.WeekNumber,
      weekStart: w.WeekStart,
      targetKcal: w.TargetKcal ?? w.TargetKcal,
      protG: w.ProtG ?? w.ProtG,
      carbsG: w.CarbsG ?? w.CarbsG,
      fatG: w.FatG ?? w.FatG,
    } as any;
  }

  openFoodDetails(food: Food) {
    this.dialog.open(FoodDetailsDialog, { data: food });
  }

  async ngOnInit(): Promise<void> {
    try {
      const [mealTypes, categories, analytics] = await Promise.all([
        this.dietService.getMealTypes(),
        this.dietService.getCategories(),
        this.dietService.getAnalyticsWeeks(),
      ]);
      this.mealTypes.set(mealTypes);
      const map: Record<string, number> = {};
      categories.forEach(c => { if (c && c.Category) map[c.Category.toLowerCase()] = c.ID; });
      this.categoryNameToId.set(map);
      this.analyticsWeeks.set(analytics);
    } catch (err) {
      console.error('Failed to initialize meal plan', err);
      this.analyticsError.set('Failed to load meal plan data.');
    }
  }

  async generateRandomPlan() {
    const summary = this.currentWeekSummary();
    this.generateError.set(null);
    this.saveStatus.set(null);
    this.generatedPlan.set(null);
    this.generatedTotals.set(null);

    if (!summary || summary.targetKcal == null || summary.protG == null || summary.fatG == null || summary.carbsG == null) {
      this.generateError.set('Analytics targets are required to generate a meal plan.');
      return;
    }

    this.generating.set(true);
    try {
      const foods = await this.dietService.getAllFoods();
      const usableFoods = foods.filter(f => f.Calories > 0);
      if (!usableFoods.length) {
        this.generateError.set('No foods available in the database to build a meal plan.');
        return;
      }

      const target = {
        kcal: summary.targetKcal,
        protein: summary.protG,
        carbs: summary.carbsG,
        fat: summary.fatG,
      };

      // Fallback candidate pool (all usable foods) for when a specific bucket is empty
      const candidateFoods = usableFoods;

      let bestPlan: { slot: string; food: Food; grams: number; calories: number; protein: number; carbs: number; fat: number; }[] | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      let bestTotals: { calories: number; protein: number; carbs: number; fat: number; kcalErrorPct: number; proteinErrorPct: number; carbsErrorPct: number; fatErrorPct: number; } | null = null;

      const attempts = 400;
      const maxError = 0.10; // 10% maximum allowed error vs target

      const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

      // Define allowed category name lists per meal type. Edit these lists
      // to restrict which food categories are eligible for each meal.
      // Leave an array empty to allow all categories for that meal.
      const allowedCategoryNamesPerMeal: Record<string, string[]> = {
        Breakfast: [],
        Lunch: [],
        Dinner: [],
        Snack: [],
      };

      // Categories that should never be suggested in any meal plan.
      // Add common variants / translations here (lowercase matching will be used).
      const bannedCategoryNames = [
        'alcohol',
        'alcoholic beverages',
        'alcolici',
        'bevande alcoliche',
        'wine',
        'beer',
        'spirits',
        'liquori',
        'cocktail',
      ];

      // Resolve banned category IDs once
      const nameToIdMap = this.categoryNameToId();
      const bannedCategoryIds = bannedCategoryNames
        .map(n => nameToIdMap[n.toLowerCase()])
        .filter((x): x is number => typeof x === 'number');

      for (let attempt = 0; attempt < attempts; attempt++) {
        const plan: { slot: string; food: Food; grams: number; calories: number; protein: number; carbs: number; fat: number; }[] = [];

        for (const slot of this.slotDefinitions) {
          const slotKcalTarget = target.kcal * slot.share;

          // Build a per-slot candidate pool honoring the Meal classification
          const slotNameLower = slot.name.toLowerCase();
          const mealKey = slotNameLower.startsWith('breakfast') ? 'Breakfast'
            : slotNameLower.startsWith('lunch') ? 'Lunch'
            : slotNameLower.startsWith('dinner') ? 'Dinner'
            : slotNameLower.includes('snack') ? 'Snack'
            : null;

          // Resolve meal type ID for this slot (if available)
          const mt = this.mealTypes().find(x => x.Meal.toLowerCase() === (mealKey || '').toLowerCase());
          const mealIdForSlot = mt ? mt.ID : null;

          // First filter by MealId (if meal types are defined), keeping
          // foods with null MealId as indifferent.
          const slotPoolByMeal = candidateFoods.filter(f => {
            if (f.MealId == null) return true;
            return mealIdForSlot ? f.MealId === mealIdForSlot : true;
          });

          // Exclude banned categories (if identified). Foods with null
          // ID_Category remain allowed.
          let slotPoolFiltered = slotPoolByMeal.filter(f => f.ID_Category == null || !bannedCategoryIds.includes(f.ID_Category));

          // Then restrict by allowed categories for the resolved mealKey.
          // Foods with null/undefined ID_Category are allowed everywhere.
          const allowedNames = allowedCategoryNamesPerMeal[mealKey ?? ''] ?? [];
          let slotPool = slotPoolFiltered;
          if (allowedNames && allowedNames.length) {
            const allowedIds = allowedNames
              .map(n => nameToIdMap[n.toLowerCase()])
              .filter((x): x is number => typeof x === 'number');
            if (allowedIds.length) {
              slotPool = slotPoolFiltered.filter(f => f.ID_Category == null || allowedIds.includes(f.ID_Category));
            } else {
              // If none of the provided names resolved to IDs, fall back to meal-filtered pool
              slotPool = slotPoolFiltered;
            }
          }

          // Classify slotPool by macro dominance
          const slotMacro = slotPool.map(f => {
            const protCal = f.Protein * 4;
            const carbCal = f.Carbs * 4;
            const fatCal = f.Fat * 9;
            const totalMacroCal = protCal + carbCal + fatCal;
            return { food: f, protCal, carbCal, fatCal, totalMacroCal };
          }).filter(x => x.totalMacroCal > 0);

          const proteinRichFoods = slotMacro
            .filter(x => x.protCal >= x.carbCal && x.protCal >= x.fatCal)
            .map(x => x.food);
          const carbRichFoods = slotMacro
            .filter(x => x.carbCal > x.protCal && x.carbCal >= x.fatCal)
            .map(x => x.food);
          const fatRichFoods = slotMacro
            .filter(x => x.fatCal > x.protCal && x.fatCal > x.carbCal)
            .map(x => x.food);

          // For snacks, prefer foods that are richer in carbs or fats than protein
          const snackPreferredFoods = slotMacro
            .filter(x => (x.carbCal > x.protCal) || (x.fatCal > x.protCal))
            .map(x => x.food);

          const chooseRandom = (list: Food[], fallback: Food[]) => {
            const pool = list.length ? list : fallback;
            return pool[pool.length === 1 ? 0 : randInt(0, pool.length - 1)];
          };

          if (slot.isMain) {
            let protFood = chooseRandom(proteinRichFoods, candidateFoods);
            let carbFood = chooseRandom(carbRichFoods, candidateFoods);
            let fatFood = chooseRandom(fatRichFoods, candidateFoods);

            // For Breakfast, prefer egg-white (albume) for protein and bread for carbs.
            const isBreakfast = (mealKey === 'Breakfast');
            if (isBreakfast) {
              const eggNameTerms = ['albume', 'albumi', 'egg white', 'albumen', 'eggwhite'];
              const breadNameTerms = ['pane', 'bread', 'toast', 'bagel', 'brioche'];

              const eggCandidates = slotPool.filter(f => {
                const name = (f.Food || '').toLowerCase();
                return eggNameTerms.some(t => name.includes(t));
              });
              if (eggCandidates.length) {
                protFood = eggCandidates[randInt(0, eggCandidates.length - 1)];
              }

              const breadCandidates = slotPool.filter(f => {
                const name = (f.Food || '').toLowerCase();
                return breadNameTerms.some(t => name.includes(t));
              });
              if (breadCandidates.length) {
                carbFood = breadCandidates[randInt(0, breadCandidates.length - 1)];
              }
            }

            // For Lunch, prefer meat + pasta + verdure (vegetables)
            const isLunch = (mealKey === 'Lunch');
            if (isLunch) {
              const pastaTerms = ['pasta','spaghetti','penne','fusilli','tagliatelle','maccheroni','linguine','rigatoni','farfalle','lasagna','gnocchi','orecchiette'];
              const meatTerms = ['chicken','beef','pork','veal','lamb','prosciutto','prosciutti','carne','pollo','manzo','maiale','agnello','bistecca','hamburger','salame','salsiccia','tataki'];
              const vegTerms = ['vegetable','verdure','verdura','vegetales','spinach','lettuce','broccoli','zucchini','zucchine','peppers','peperoni','carrot','carote','insalata','spinaci','cavolo','pomodoro','verdure'];

              const nameOf = (f: Food) => (f.Food || '').toLowerCase();

              const meatCandidates = slotPool.filter(f => meatTerms.some(t => nameOf(f).includes(t)));
              const pastaCandidates = slotPool.filter(f => pastaTerms.some(t => nameOf(f).includes(t)));
              const vegCandidates = slotPool.filter(f => vegTerms.some(t => nameOf(f).includes(t)));

              if (meatCandidates.length) {
                protFood = meatCandidates[randInt(0, meatCandidates.length - 1)];
              }
              if (pastaCandidates.length) {
                carbFood = pastaCandidates[randInt(0, pastaCandidates.length - 1)];
              }
              // Put vegetables into the 'fat' slot when possible to ensure inclusion
              if (vegCandidates.length) {
                fatFood = vegCandidates[randInt(0, vegCandidates.length - 1)];
              }
            }

            // Avoid obvious duplicates within the same meal
            const usedIds = new Set<number>([protFood.ID]);
            if (usedIds.has(carbFood.ID)) {
              const alt = carbRichFoods.filter(f => !usedIds.has(f.ID));
              if (alt.length) {
                carbFood = alt[randInt(0, alt.length - 1)];
              }
            }
            usedIds.add(carbFood.ID);
            if (usedIds.has(fatFood.ID)) {
              const alt = fatRichFoods.filter(f => !usedIds.has(f.ID));
              if (alt.length) {
                fatFood = alt[randInt(0, alt.length - 1)];
              }
            }

            const protKcalTarget = slotKcalTarget * 0.35;
            const carbKcalTarget = slotKcalTarget * 0.40;
            const fatKcalTarget = slotKcalTarget * 0.25;

            const addFoodPortion = (food: Food, kcalTarget: number) => {
              let grams = Math.round((kcalTarget / food.Calories) * 100);
              grams = Math.max(30, Math.min(400, grams));
              grams = Math.round(grams / 5) * 5;

              const factor = grams / 100;
              const calories = food.Calories * factor;
              const protein = food.Protein * factor;
              const carbs = food.Carbs * factor;
              const fat = food.Fat * factor;

              plan.push({ slot: slot.name, food, grams, calories, protein, carbs, fat });
            };

            addFoodPortion(protFood, protKcalTarget);
            addFoodPortion(carbFood, carbKcalTarget);
            addFoodPortion(fatFood, fatKcalTarget);
          } else {
            // Snacks: still build a 3-component mini-meal (protein, carbs, fat)
            // Prefer snack-friendly foods for carbs/fats but allow protein picks.
            let protFood = chooseRandom(proteinRichFoods, candidateFoods);
            let carbFallback = snackPreferredFoods.length ? snackPreferredFoods : candidateFoods;
            let carbFood = chooseRandom(carbRichFoods, carbFallback);
            let fatFallback = snackPreferredFoods.length ? snackPreferredFoods : candidateFoods;
            let fatFood = chooseRandom(fatRichFoods, fatFallback);

            // Avoid duplicates within the same slot
            const usedIds = new Set<number>([protFood.ID]);
            if (usedIds.has(carbFood.ID)) {
              const alt = carbRichFoods.filter(f => !usedIds.has(f.ID));
              if (alt.length) carbFood = alt[randInt(0, alt.length - 1)];
            }
            usedIds.add(carbFood.ID);
            if (usedIds.has(fatFood.ID)) {
              const alt = fatRichFoods.filter(f => !usedIds.has(f.ID));
              if (alt.length) fatFood = alt[randInt(0, alt.length - 1)];
            }

            const protKcalTarget = slotKcalTarget * 0.35;
            const carbKcalTarget = slotKcalTarget * 0.40;
            const fatKcalTarget = slotKcalTarget * 0.25;

            const addFoodPortion = (food: Food, kcalTarget: number) => {
              let grams = Math.round((kcalTarget / food.Calories) * 100);
              grams = Math.max(30, Math.min(400, grams));
              grams = Math.round(grams / 5) * 5;

              const factor = grams / 100;
              const calories = food.Calories * factor;
              const protein = food.Protein * factor;
              const carbs = food.Carbs * factor;
              const fat = food.Fat * factor;

              plan.push({ slot: slot.name, food, grams, calories, protein, carbs, fat });
            };

            addFoodPortion(protFood, protKcalTarget);
            addFoodPortion(carbFood, carbKcalTarget);
            addFoodPortion(fatFood, fatKcalTarget);
          }
        }

        let totals = plan.reduce((acc, item) => {
          acc.calories += item.calories;
          acc.protein += item.protein;
          acc.carbs += item.carbs;
          acc.fat += item.fat;
          return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        // Try a global gram scaling pass to better hit total kcal while
        // preserving each food's macro ratios.
        if (totals.calories > 0) {
          const scale = target.kcal / totals.calories;
          if (scale > 0.5 && scale < 1.5) {
            const scaledPlan: { slot: string; food: Food; grams: number; calories: number; protein: number; carbs: number; fat: number; }[] = [];

            for (const item of plan) {
              let grams = Math.round(item.grams * scale);
              grams = Math.max(30, Math.min(400, grams));
              grams = Math.round(grams / 5) * 5;

              const factor = grams / 100;
              const calories = item.food.Calories * factor;
              const protein = item.food.Protein * factor;
              const carbs = item.food.Carbs * factor;
              const fat = item.food.Fat * factor;

              scaledPlan.push({ slot: item.slot, food: item.food, grams, calories, protein, carbs, fat });
            }

            const scaledTotals = scaledPlan.reduce((acc, item) => {
              acc.calories += item.calories;
              acc.protein += item.protein;
              acc.carbs += item.carbs;
              acc.fat += item.fat;
              return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

            plan.length = 0;
            for (const it of scaledPlan) {
              plan.push(it);
            }
            totals = scaledTotals;
          }
        }

        const kcalErrorPct = (totals.calories - target.kcal) / target.kcal;
        const proteinErrorPct = target.protein > 0 ? (totals.protein - target.protein) / target.protein : 0;
        const carbsErrorPct = target.carbs > 0 ? (totals.carbs - target.carbs) / target.carbs : 0;
        const fatErrorPct = target.fat > 0 ? (totals.fat - target.fat) / target.fat : 0;

        const score = Math.max(
          Math.abs(kcalErrorPct),
          Math.abs(proteinErrorPct),
          Math.abs(carbsErrorPct),
          Math.abs(fatErrorPct),
        );

        if (score < bestScore) {
          bestScore = score;
          bestPlan = plan;
          bestTotals = {
            calories: totals.calories,
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
            kcalErrorPct,
            proteinErrorPct,
            carbsErrorPct,
            fatErrorPct,
          };
        }
        // Early exit if we already found a plan within the tolerance
        if (score <= maxError) {
          break;
        }
      }

      if (!bestPlan || !bestTotals) {
        this.generateError.set('Could not generate a meal plan from the available foods.');
        return;
      }

      // Always show the best plan found, even if the error is above
      // the maxError threshold (which is only used for early exit).
      this.generatedPlan.set(bestPlan);
      this.generatedTotals.set(bestTotals);
    } catch (err) {
      console.error('Failed to generate random meal plan', err);
      this.generateError.set('Failed to generate a random meal plan.');
    } finally {
      this.generating.set(false);
    }
  }

  async saveCurrentPlan() {
    this.saveStatus.set(null);

    const plan = this.generatedPlan();
    const totals = this.generatedTotals();
    const summary = this.currentWeekSummary();

    if (!plan || !totals) {
      this.saveStatus.set('Generate a plan before saving.');
      return;
    }

    const payload: MealPlanSaveRequest = {
      weekNumber: summary?.weekNumber ?? null,
      weekStart: summary?.weekStart ?? null,
      targetKcal: summary?.targetKcal ?? null,
      protG: summary?.protG ?? null,
      carbsG: summary?.carbsG ?? null,
      fatG: summary?.fatG ?? null,
      totals: {
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      },
      items: plan.map(item => ({
        slot: item.slot,
        foodId: item.food.ID,
        foodName: item.food.Food,
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    };

    this.saving.set(true);
    try {
      await this.dietService.saveMealPlan(payload);
      this.saveStatus.set('Meal plan saved.');
    } catch (err) {
      console.error('Failed to save meal plan', err);
      this.saveStatus.set('Failed to save meal plan.');
    } finally {
      this.saving.set(false);
    }
  }

  formatDeltaPercent(delta?: number | null): string {
    if (delta == null) {
      return '-';
    }
    const value = delta * 100;
    const abs = Math.abs(value).toFixed(1);
    if (value > 0) {
      return `+${abs}%`;
    }
    if (value < 0) {
      return `-${abs}%`;
    }
    return '0.0%';
  }

  deltaClass(delta?: number | null): string {
    if (delta == null || delta === 0) {
      return '';
    }
    return delta > 0 ? 'delta-pos' : 'delta-neg';
  }
}
