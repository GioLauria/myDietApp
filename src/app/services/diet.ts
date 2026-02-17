import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface FoodCategory {
  ID: number;
  Category: string;
  created_by?: number;
}

export interface Food {
  ID: number;
  Food: string;
  Protein: number;
  Carbs: number;
  Fat: number;
  Calories: number;
  ID_Category: number;
  MealId?: number | null;
  // Included when the backend joins tblFood with tblFoodCategories
  FoodCategory?: FoodCategory;
  // Included when the backend joins tblFood with tblMealType
  MealType?: MealType | null;
  created_by?: number;
}

export interface MealType {
  ID: number;
  Meal: string;
}

export interface Profile {
  ID?: number;
  Name: string;
  Surname: string;
  Email: string;
  Height: number;
  DateOfBirth: string;
  Sex: 'Male' | 'Female';
  Activity: number;
  role_id?: number;
  ColorScheme?: string | null;
  FontFamily?: string | null;
  FontSize?: number | null;
}

export interface UserType {
  ID: number;
  Type: string;
}

export interface WeightLogEntry {
  ID: number;
  EntryDate: string;
  Weight: number;
  BodyFat: number | null;
  LeanMass?: number | null;
}

export interface WeightLogStats {
  days: number;
  averageWeight: number | null;
  averageBodyFat: number | null;
  averageLeanMass: number | null;
}

export interface WeightLogResponse {
  entries: WeightLogEntry[];
  stats: WeightLogStats;
}

export interface DietPhaseRow {
  ID: number;
  profile_id: number;
  PhaseKey: string;
  ProteinPerKgLean: number;
  FatPerKgBody: number;
  CalorieOffset: number;
}

export interface AnalyticsWeekSetting {
  ID?: number;
  profile_id?: number;
  WeekStart: string;
  WeekNumber: number;
  Workout: 'Y' | 'N';
  // PhaseId is the ID of tblDietPhase (what tblAnalytics.PhaseKey stores)
  PhaseId: number | null;
  // PhaseKey is the textual key from tblDietPhase (e.g. 'cut', 'bulk')
  PhaseKey: string | null;
  // Computed analytics metrics (may be null if not yet calculated)
  AvgWeight?: number | null;
  AvgBodyFat?: number | null;
  FatMass?: number | null;
  LeanMass?: number | null;
  BmrRest?: number | null;
  BmrMotion?: number | null;
  Offset?: number | null;
  TargetKcal?: number | null;
  ProtG?: number | null;
  CarbsG?: number | null;
  FatG?: number | null;
  CalProt?: number | null;
  CalCarbs?: number | null;
  CalFat?: number | null;
  PercProt?: number | null;
  PercCarbs?: number | null;
  PercFat?: number | null;
  Ffmi?: number | null;
  TableSize?: number | null;
}

export interface SavedMealPlanItem {
  slot: string;
  foodId: number;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanSaveRequest {
  weekNumber: number | null;
  weekStart: string | null;
  targetKcal: number | null;
  protG: number | null;
  carbsG: number | null;
  fatG: number | null;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  items: SavedMealPlanItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DietService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';
  private dailyGoal = signal<number>(2000);

  async getCategories() {
    return await firstValueFrom(this.http.get<FoodCategory[]>(`${this.apiUrl}/categories`));
  }

  async addCategory(category: { Category: string }) {
    return await firstValueFrom(this.http.post<FoodCategory>(`${this.apiUrl}/categories`, category));
  }

  async updateCategory(id: number, category: { Category: string }) {
    return await firstValueFrom(this.http.put<FoodCategory>(`${this.apiUrl}/categories/${id}`, category));
  }

  async deleteCategory(id: number) {
    return await firstValueFrom(this.http.delete(`${this.apiUrl}/categories/${id}`));
  }

  async getUserTypes() {
    return await firstValueFrom(this.http.get<UserType[]>(`${this.apiUrl}/user-types`));
  }

  async getFoodsByCategory(categoryId: number) {
    return await firstValueFrom(this.http.get<Food[]>(`${this.apiUrl}/foods/category/${categoryId}`));
  }

  async getAllFoods() {
    return await firstValueFrom(this.http.get<Food[]>(`${this.apiUrl}/foods`));
  }

  async searchFoods(query: string) {
    return await firstValueFrom(this.http.get<Food[]>(`${this.apiUrl}/foods/search`, {
      params: { q: query }
    }));
  }

  async addFood(food: Omit<Food, 'ID'>) {
    return await firstValueFrom(this.http.post<Food>(`${this.apiUrl}/foods`, food));
  }

  async updateFood(id: number, food: Omit<Food, 'ID'>) {
    return await firstValueFrom(this.http.put<Food>(`${this.apiUrl}/foods/${id}`, food));
  }

  async deleteFood(id: number) {
    return await firstValueFrom(this.http.delete(`${this.apiUrl}/foods/${id}`));
  }

  async getProfile() {
    return await firstValueFrom(this.http.get<Profile | null>(`${this.apiUrl}/profile`));
  }

  async saveProfile(profile: Profile) {
    return await firstValueFrom(this.http.post<Profile>(`${this.apiUrl}/profile`, profile));
  }

  getDailyGoal() {
    return this.dailyGoal;
  }

  async getDbTables() {
    return await firstValueFrom(this.http.get<string[]>(`${this.apiUrl}/admin/tables`));
  }

  async executeDbQuery(query: string) {
    return await firstValueFrom(this.http.post<any>(`${this.apiUrl}/admin/query`, { query }));
  }

  async getApiRoutes() {
    return await firstValueFrom(this.http.get<{path: string, method: string, description: string, area?: string}[]>(`${this.apiUrl}/admin/routes`));
  }

  async getMealTypes() {
    return await firstValueFrom(this.http.get<MealType[]>(`${this.apiUrl}/meal-types`));
  }

  async downloadPostmanCollection(): Promise<Blob> {
    const response = await firstValueFrom(
      this.http.get(`${this.apiUrl}/admin/postman-collection`, {
        responseType: 'blob'
      })
    );
    return response;
  }

  async getWeightLog(days?: number) {
    const options: { params?: { [key: string]: string } } = {};
    if (days != null) {
      options.params = { days: days.toString() };
    }

    return await firstValueFrom(
      this.http.get<WeightLogResponse>(`${this.apiUrl}/weight-log`, options)
    );
  }

  async addWeightLog(entry: { date: string; weight: number; bodyFat?: number | null }) {
    return await firstValueFrom(
      this.http.post<WeightLogEntry>(`${this.apiUrl}/weight-log`, entry)
    );
  }

   async updateWeightLog(id: number, entry: { weight: number; bodyFat?: number | null }) {
    return await firstValueFrom(
      this.http.put<WeightLogEntry>(`${this.apiUrl}/weight-log/${id}`, entry)
    );
  }

  async deleteWeightLog(id: number) {
    return await firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/weight-log/${id}`)
    );
  }

  async deleteAllWeightLogs() {
    return await firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/weight-log`)
    );
  }

  async getDietPhases() {
    return await firstValueFrom(
      this.http.get<DietPhaseRow[]>(`${this.apiUrl}/diet-phases`)
    );
  }

  async updateDietPhases(phases: DietPhaseRow[]) {
    return await firstValueFrom(
      this.http.put<DietPhaseRow[]>(`${this.apiUrl}/diet-phases`, phases)
    );
  }

  async getAnalyticsWeeks() {
    return await firstValueFrom(
      this.http.get<AnalyticsWeekSetting[]>(`${this.apiUrl}/analytics`)
    );
  }

  async saveAnalyticsWeeks(weeks: { weekNumber: number; startDate: string; workout: 'Y' | 'N'; phaseId?: number | null; phase?: string; tableSize?: number | null }[]) {
    return await firstValueFrom(
      this.http.put<AnalyticsWeekSetting[]>(`${this.apiUrl}/analytics`, weeks)
    );
  }

  async rebuildAnalytics() {
    return await firstValueFrom(
      this.http.post<AnalyticsWeekSetting[]>(`${this.apiUrl}/analytics/rebuild`, {})
    );
  }

  async saveMealPlan(payload: MealPlanSaveRequest) {
    return await firstValueFrom(
      this.http.post<{ ID: number; message: string }>(`${this.apiUrl}/meal-plan`, payload)
    );
  }
}
