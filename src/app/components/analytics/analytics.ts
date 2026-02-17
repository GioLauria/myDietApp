import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DietService, Profile, WeightLogEntry, DietPhaseRow } from '../../services/diet';
import { DIET_PHASES_CONFIG, DietPhaseKey, DietPhaseConfig } from '../../services/diet-phases.config';

interface AnalyticsWeekRow {
  weekNumber: number;
  startDate: string;
  workout: 'Y' | 'N';
  avgWeight: number | null;
  avgBodyFat: number | null;
  fatMass: number | null;
  leanMass: number | null;
  bmrRest: number | null;
  bmrMotion: number | null;
  phase: DietPhaseKey;
  phaseId: number | null;
  offset: number | null;
  targetKcal: number | null;
  protG: number | null;
  carbsG: number | null;
  fatG: number | null;
  calProt: number | null;
  calCarbs: number | null;
  calFat: number | null;
  percProt: number | null;
  percCarbs: number | null;
  percFat: number | null;
  ffmi: number | null;
}

const ACTIVITY_LABELS: Record<number, string> = {
  0: 'Sedentary (little or no exercise)',
  1: 'Lightly active (light exercise/sports 1-3 days/week)',
  2: 'Moderately active (exercise 3-5 days/week)',
  3: 'Very active (hard exercise 6-7 days/week)',
  4: 'Extra active (very hard exercise & physical job)'
};

const ACTIVITY_FACTORS: Record<number, number> = {
  0: 1.2,
  1: 1.375,
  2: 1.55,
  3: 1.725,
  4: 1.9
};

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, MatButtonModule],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit {
  private dietService = inject(DietService);

  profile = signal<Profile | null>(null);
  weeklyRows = signal<AnalyticsWeekRow[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // User-preferred width (in px) for analytics week columns
  weekColumnWidth = signal<number>(110);

  // Diet phase configuration loaded from the backend (falls back to DIET_PHASES_CONFIG)
  dietPhaseConfig = signal<DietPhaseRow[]>([]);
  savingDietPhases = signal<boolean>(false);
  dietPhaseSaveStatus = signal<string | null>(null);

  // Newest weeks first for display (new weeks push old ones to the right)
  displayWeeks = computed(() => [...this.weeklyRows()].reverse());

  // Week number of the most recent week (editable columns apply only here)
  currentWeekNumber = computed(() => {
    const rows = this.weeklyRows();
    if (!rows.length) {
      return null;
    }
    return Math.max(...rows.map(r => r.weekNumber));
  });

  // Expose phase configuration for the on-page submenu
  phaseConfigList = computed(() => {
    const backendConfig = this.dietPhaseConfig();
    if (backendConfig.length) {
      return backendConfig.map(phase => ({
        key: phase.PhaseKey as DietPhaseKey,
        label: this.formatPhaseLabel(phase.PhaseKey),
        config: {
          proteinPerKgLean: phase.ProteinPerKgLean,
          fatPerKgBody: phase.FatPerKgBody,
          calorieOffset: phase.CalorieOffset,
        } satisfies DietPhaseConfig,
      }));
    }

    return Object.entries(DIET_PHASES_CONFIG).map(([key, cfg]) => ({
      key: key as DietPhaseKey,
      label: this.formatPhaseLabel(key),
      config: cfg as DietPhaseConfig,
    }));
  });

  displayedColumns: string[] = [
    'week',
    'workout',
    'avgWeight',
    'avgBodyFat',
    'fatMass',
    'leanMass',
    'bmrRest',
    'bmrMotion',
    'offset',
    'targetKcal',
    'phase',
    'prot',
    'carbs',
    'fat',
    'calProt',
    'calCarbs',
    'calFat',
    'percProt',
    'percCarbs',
    'percFat',
    'ffmi',
  ];

  phaseOptions = Object.entries(DIET_PHASES_CONFIG).map(([key, cfg]) => ({
    key: key as DietPhaseKey,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  }));

  profileHeightCm = computed(() => this.profile()?.Height ?? null);

  profileSex = computed(() => this.profile()?.Sex ?? null);

  activityLabel = computed(() => {
    const p = this.profile();
    if (!p) return null;
    return ACTIVITY_LABELS[p.Activity] ?? `Activity ${p.Activity}`;
  });

  ageYears = computed(() => {
    const p = this.profile();
    if (!p || !p.DateOfBirth) return null;
    const dob = new Date(p.DateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - dob.getTime();
    const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    return years;
  });

  canEditWeek(row: AnalyticsWeekRow): boolean {
    const currentWeek = this.currentWeekNumber();
    if (currentWeek == null) {
      return false;
    }
    return row.weekNumber === currentWeek;
  }

  phaseLabel(key: DietPhaseKey): string {
    return this.formatPhaseLabel(key);
  }

  private findPhaseId(key: DietPhaseKey): number | null {
    const cfg = this.dietPhaseConfig();
    const row = cfg.find(p => p.PhaseKey === key);
    return row ? row.ID : null;
  }

  async ngOnInit() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [profile, weightLog] = await Promise.all([
        this.dietService.getProfile(),
        this.dietService.getWeightLog(),
      ]);

      // Load diet phase configuration from backend, falling back to defaults if needed
      try {
        const phases = await this.dietService.getDietPhases();
        this.dietPhaseConfig.set(phases);
      } catch (e) {
        console.warn('Failed to load diet phases from backend, using defaults', e);
        const fallback: DietPhaseRow[] = Object.entries(DIET_PHASES_CONFIG).map(([key, cfg], index) => ({
          ID: index + 1,
          profile_id: 0,
          PhaseKey: key,
          ProteinPerKgLean: cfg.proteinPerKgLean,
          FatPerKgBody: cfg.fatPerKgBody,
          CalorieOffset: cfg.calorieOffset,
        }));
        this.dietPhaseConfig.set(fallback);
      }

      if (!profile) {
        this.profile.set(null);
        this.weeklyRows.set([]);
        this.error.set('Please complete your profile to see analytics.');
        return;
      }

      this.profile.set(profile);
      this.buildWeeklyRows(profile, weightLog.entries);

      // Apply any saved per-week analytics settings (workout/phase)
      try {
        const saved = await this.dietService.getAnalyticsWeeks();
        if (saved && saved.length) {
          const current = this.weeklyRows();
          const byStart = new Map(saved.map(r => [r.WeekStart, r]));
          const merged = current.map(row => {
            const match = byStart.get(row.startDate);
            if (!match) {
              return row;
            }

            const workout = match.Workout === 'Y' || match.Workout === 'N' ? match.Workout : row.workout;
            const phaseKey = (match.PhaseKey as DietPhaseKey) || row.phase;
            const phaseId = match.PhaseId ?? this.findPhaseId(phaseKey);
            return this.withPhase({ ...row, workout, phaseId }, phaseKey);
          });
          this.weeklyRows.set(merged);

          // Restore saved table size if available (use the first non-null value)
          const widthSource = saved.find(r => r.TableSize != null);
          if (widthSource && widthSource.TableSize && widthSource.TableSize > 0) {
            this.weekColumnWidth.set(widthSource.TableSize);
          }
        }
      } catch (e) {
        console.error('Failed to load saved analytics weeks', e);
      }
    } catch (err) {
      console.error('Error loading analytics data', err);
      this.error.set('Failed to load analytics data.');
    } finally {
      this.loading.set(false);
    }
  }

  onTableSizeChange(newSize: number) {
    if (!newSize || newSize <= 40) {
      return;
    }
    this.weekColumnWidth.set(newSize);

    const rows = this.weeklyRows();
    if (!rows.length) {
      return;
    }

    // Persist the chosen size for all analytics rows for this user
    this.dietService.saveAnalyticsWeeks(
      rows.map(r => ({
        weekNumber: r.weekNumber,
        startDate: r.startDate,
        workout: r.workout,
        phaseId: r.phaseId ?? this.findPhaseId(r.phase),
        tableSize: newSize,
      }))
    ).catch(err => {
      console.error('Failed to save analytics table size', err);
    });
  }

  onPhaseChange(row: AnalyticsWeekRow, phase: DietPhaseKey) {
    const current = this.weeklyRows();
    const updated = current.map(r => {
      if (r.weekNumber !== row.weekNumber) return r;
      return this.withPhase(r, phase);
    });
    this.weeklyRows.set(updated);

    const target = updated.find(r => r.weekNumber === row.weekNumber);
    if (target) {
      this.saveAnalyticsForWeek(target);
    }
  }

  onWorkoutChange(row: AnalyticsWeekRow, workout: 'Y' | 'N') {
    const current = this.weeklyRows();
    const updated = current.map(r =>
      r.weekNumber === row.weekNumber ? { ...r, workout } : r
    );
    this.weeklyRows.set(updated);

    const target = updated.find(r => r.weekNumber === row.weekNumber);
    if (target) {
      this.saveAnalyticsForWeek(target);
    }
  }

  private buildWeeklyRows(profile: Profile, entries: WeightLogEntry[]) {
    if (!entries.length) {
      this.weeklyRows.set([]);
      return;
    }

    const sorted = [...entries].sort((a, b) => {
      const da = new Date(a.EntryDate).getTime();
      const db = new Date(b.EntryDate).getTime();
      return da - db;
    });

    const firstDate = new Date(sorted[0].EntryDate);
    const msPerDay = 24 * 60 * 60 * 1000;

    const groups = new Map<number, WeightLogEntry[]>();

    for (const e of sorted) {
      const d = new Date(e.EntryDate);
      const diffDays = Math.floor((d.getTime() - firstDate.getTime()) / msPerDay);
      const weekIndex = Math.floor(diffDays / 7);
      const existing = groups.get(weekIndex) ?? [];
      existing.push(e);
      groups.set(weekIndex, existing);
    }

    const heightCm = profile.Height;
    const heightM = heightCm > 0 ? heightCm / 100 : null;
    const ageYears = this.ageYears();
    const activityFactor = ACTIVITY_FACTORS[profile.Activity] ?? 1.2;
    const workoutFlag: 'Y' | 'N' = profile.Activity > 0 ? 'Y' : 'N';

    const avg = (values: (number | null | undefined)[]) => {
      const nums = values.filter((v): v is number => v != null && !isNaN(v));
      if (!nums.length) return null;
      const sum = nums.reduce((s, v) => s + v, 0);
      return sum / nums.length;
    };

    const rows: AnalyticsWeekRow[] = [];

    const sortedWeeks = Array.from(groups.keys()).sort((a, b) => a - b);

    for (const weekIndex of sortedWeeks) {
      const weekEntries = groups.get(weekIndex)!;
      const weekNumber = weekIndex + 1;

      const avgWeight = avg(weekEntries.map(e => e.Weight));
      const avgBf = avg(weekEntries.map(e => e.BodyFat));

      let fatMass: number | null = null;
      let leanMass: number | null = null;

      if (avgWeight != null && avgBf != null) {
        fatMass = avgWeight * (avgBf / 100);
        leanMass = avgWeight - fatMass;
      }

      let ffmi: number | null = null;
      if (leanMass != null && heightM && heightM > 0) {
        ffmi = leanMass / (heightM * heightM);
      }

      let bmrRest: number | null = null;
      let bmrMotion: number | null = null;

      if (avgWeight != null && heightCm > 0 && ageYears != null) {
        const base = 10 * avgWeight + 6.25 * heightCm - 5 * ageYears;
        if (profile.Sex === 'Male') {
          bmrRest = base + 5;
        } else {
          bmrRest = base - 161;
        }
        bmrMotion = bmrRest * activityFactor;
      }

      const startDate = new Date(firstDate.getTime() + weekIndex * 7 * msPerDay);
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

      // Default phase is "cut"; user can change it per week
      let row: AnalyticsWeekRow = {
        weekNumber,
        startDate: startDateStr,
        workout: workoutFlag,
        avgWeight,
        avgBodyFat: avgBf,
        fatMass,
        leanMass,
        bmrRest,
        bmrMotion,
        phase: 'cut',
        phaseId: this.findPhaseId('cut'),
        offset: null,
        targetKcal: null,
        protG: null,
        carbsG: null,
        fatG: null,
        calProt: null,
        calCarbs: null,
        calFat: null,
        percProt: null,
        percCarbs: null,
        percFat: null,
        ffmi,
      };

      row = this.withPhase(row, 'cut');

      rows.push(row);
    }

    this.weeklyRows.set(rows);
  }

  private withPhase(row: AnalyticsWeekRow, phase: DietPhaseKey): AnalyticsWeekRow {
    const cfg = this.getPhaseConfig(phase);
    const updated: AnalyticsWeekRow = { ...row, phase, phaseId: this.findPhaseId(phase) };

    if (row.bmrMotion == null || row.avgWeight == null || row.leanMass == null) {
      updated.offset = cfg.calorieOffset;
      updated.targetKcal = null;
      updated.protG = null;
      updated.carbsG = null;
      updated.fatG = null;
      updated.calProt = null;
      updated.calCarbs = null;
      updated.calFat = null;
      updated.percProt = null;
      updated.percCarbs = null;
      updated.percFat = null;
      return updated;
    }

    const targetKcal = row.bmrMotion + cfg.calorieOffset;

    if (targetKcal <= 0) {
      updated.offset = cfg.calorieOffset;
      updated.targetKcal = targetKcal;
      updated.protG = null;
      updated.carbsG = null;
      updated.fatG = null;
      updated.calProt = null;
      updated.calCarbs = null;
      updated.calFat = null;
      updated.percProt = null;
      updated.percCarbs = null;
      updated.percFat = null;
      return updated;
    }

    const protG = cfg.proteinPerKgLean * row.leanMass;
    const fatG = cfg.fatPerKgBody * row.avgWeight;

    const calProt = protG * 4;
    const calFat = fatG * 9;
    const calCarbs = Math.max(targetKcal - (calProt + calFat), 0);
    const carbsG = calCarbs / 4;

    const percProt = (calProt / targetKcal) * 100;
    const percCarbs = (calCarbs / targetKcal) * 100;
    const percFat = (calFat / targetKcal) * 100;

    updated.offset = cfg.calorieOffset;
    updated.targetKcal = targetKcal;
    updated.protG = protG;
    updated.carbsG = carbsG;
    updated.fatG = fatG;
    updated.calProt = calProt;
    updated.calCarbs = calCarbs;
    updated.calFat = calFat;
    updated.percProt = percProt;
    updated.percCarbs = percCarbs;
    updated.percFat = percFat;

    return updated;
  }

  private getPhaseConfig(phase: DietPhaseKey): DietPhaseConfig {
    const backend = this.dietPhaseConfig();
    const found = backend.find(p => p.PhaseKey === phase);
    if (found) {
      return {
        proteinPerKgLean: found.ProteinPerKgLean,
        fatPerKgBody: found.FatPerKgBody,
        calorieOffset: found.CalorieOffset,
      };
    }
    return DIET_PHASES_CONFIG[phase];
  }

  formatPhaseLabel(key: string): string {
    if (!key) return '';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  private async saveAnalyticsForWeek(row: AnalyticsWeekRow) {
    try {
      await this.dietService.saveAnalyticsWeeks([
        {
          weekNumber: row.weekNumber,
          startDate: row.startDate,
          workout: row.workout,
          // Send the DietPhase ID; fall back to resolving from key if missing
          phaseId: row.phaseId ?? this.findPhaseId(row.phase),
        },
      ]);
    } catch (e) {
      console.error('Failed to save analytics week', e);
    }
  }

  onPhaseConfigNumberChange(phaseKey: DietPhaseKey, field: 'ProteinPerKgLean' | 'FatPerKgBody' | 'CalorieOffset', rawValue: string) {
    const value = Number(rawValue);
    const current = this.dietPhaseConfig();
    const updated = current.map(p => {
      if (p.PhaseKey !== phaseKey) return p;
      return {
        ...p,
        [field]: isNaN(value) ? p[field] : value,
      } as DietPhaseRow;
    });
    this.dietPhaseConfig.set(updated);
    this.dietPhaseSaveStatus.set(null);

    // Reapply configuration to all weeks so analytics reflect edits immediately
    const rows = this.weeklyRows().map(r => this.withPhase(r, r.phase));
    this.weeklyRows.set(rows);
  }

  async saveDietPhaseConfig() {
    this.savingDietPhases.set(true);
    this.dietPhaseSaveStatus.set(null);
    try {
      const current = this.dietPhaseConfig();
      const updated = await this.dietService.updateDietPhases(current);
      this.dietPhaseConfig.set(updated);

      // Ensure weekly analytics are recomputed with persisted values
      const rows = this.weeklyRows().map(r => this.withPhase(r, r.phase));
      this.weeklyRows.set(rows);

      this.dietPhaseSaveStatus.set('Diet phase configuration saved');
    } catch (e) {
      console.error('Failed to save diet phase configuration', e);
      this.dietPhaseSaveStatus.set('Failed to save diet phase configuration');
    } finally {
      this.savingDietPhases.set(false);
    }
  }
}
