import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { DietService, Profile, WeightLogEntry, WeightLogStats } from '../../services/diet';

@Component({
  selector: 'app-weight-log',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './weight-log.html',
  styleUrl: './weight-log.scss',
})
export class WeightLog implements OnInit {
  private fb = inject(FormBuilder);
  private dietService = inject(DietService);
  private snackBar = inject(MatSnackBar);

  entries = signal<WeightLogEntry[]>([]);
  stats = signal<WeightLogStats | null>(null);
  enrichedEntries = signal<(
    WeightLogEntry & {
      LeanMass: number | null;
      leanDelta: number | null;
      fatMass: number | null;
      fatDelta: number | null;
      bmi: number | null;
      ffmi: number | null;
      avgWeight7: number | null;
      diffPrevWeek: number | null;
      bfAvg: number | null;
      bmiAvg: number | null;
      leanAvg: number | null;
      leanDeltaAvg: number | null;
      fatAvg: number | null;
      fatDeltaAvg: number | null;
      ffmiAvg: number | null;
    }
  )[]>([]);

  private heightM: number | null = null;
  private sex: 'Male' | 'Female' | null = null;
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  userRole = signal<string | null>(null);

  // Inline editing state
  editingId = signal<number | null>(null);
  editWeight = signal<number | null>(null);
  editBodyFat = signal<number | null>(null);

  displayedColumns: string[] = [
    'date',
    'weight',
    'bodyFat',
    'leanMass',
    'leanDelta',
    'fatMass',
    'fatDelta',
    'bmi',
    'avgWeight7',
    'diffPrevWeek',
    'bfAvg',
    'bmiAvg',
    'leanAvg',
    'leanDeltaAvg',
    'fatAvg',
    'fatDeltaAvg',
    'ffmi',
    'actions',
  ];

  logForm = this.fb.group({
    date: [new Date(), Validators.required],
    weight: [null as number | null, [Validators.required, Validators.min(0)]],
    bodyFat: [null as number | null, [Validators.min(0), Validators.max(100)]],
  });

  async ngOnInit() {
    await this.loadWeightLog();
  }

  latestEntry() {
    const list = this.enrichedEntries();
    return list.length ? list[0] : null;
  }

  gaugeAngle(metric: 'weight' | 'bodyFat' | 'lean' | 'fat', value: number | null | undefined): number {
    if (value == null || isNaN(value)) {
      return 90; // neutral middle
    }

    const values = this.getSeriesValues(metric);
    if (!values.length) {
      return 90;
    }

    // Minimum is always 0 for all gauges
    let min = 0;
    let max = Math.max(...values);

    // Avoid zero-range which would break the ratio; widen slightly
    if (max <= min) {
      max = min + 1;
    }

    const clamped = Math.min(Math.max(value, min), max);
    const ratio = (clamped - min) / (max - min);

    // Map to semi-circle: -90deg (far left) to +90deg (far right)
    return -90 + ratio * 180;
  }

  private getSeriesValues(metric: 'weight' | 'bodyFat' | 'lean' | 'fat'): number[] {
    const series = this.enrichedEntries();
    if (!series.length) return [];

    const values: number[] = [];
    for (const e of series) {
      let v: number | null | undefined;
      switch (metric) {
        case 'weight':
          v = e.Weight;
          break;
        case 'bodyFat':
          v = e.BodyFat;
          break;
        case 'lean':
          v = e.LeanMass ?? null;
          break;
        case 'fat':
          v = e.fatMass ?? null;
          break;
      }
      if (v != null && !isNaN(v)) {
        values.push(v);
      }
    }
    return values;
  }

  seriesMin(metric: 'weight' | 'bodyFat' | 'lean' | 'fat'): number | null {
    const values = this.getSeriesValues(metric);
    if (!values.length) return null;
    // Displayed minimum is always 0 when data exists
    return 0;
  }

  seriesMax(metric: 'weight' | 'bodyFat' | 'lean' | 'fat'): number | null {
    const values = this.getSeriesValues(metric);
    if (!values.length) return null;
    return Math.max(...values);
  }

  private healthLevel(metric: 'weight' | 'bodyFat' | 'lean' | 'fat'): 'good' | 'ok' | 'bad' {
    const latest = this.latestEntry();
    if (!latest) return 'ok';

    // Weekly trend for weight: negative = loss (good), positive = gain (bad)
    if (metric === 'weight') {
      const trend = latest.diffPrevWeek;
      if (trend == null || isNaN(trend)) return 'ok';
      if (trend < -0.1) return 'good';
      if (trend > 0.1) return 'bad';
      return 'ok';
    }

    // Use BF% guidelines specifically for the BF dial
    if (metric === 'bodyFat') {
      const bf = latest.BodyFat;
      if (bf == null || isNaN(bf)) return 'ok';

      const sex = this.sex;

      if (sex === 'Male') {
        // Men Body Fat Levels (BF%)
        // 0–6%   Risky (too low)   → ok (yellow)
        // 6–18%  Healthy           → good (green)
        // 18–25% Optimal           → good (green)
        // 25%+   Not Healthy (high)→ bad (red)
        if (bf < 6) return 'ok';      // risky low fat
        if (bf < 18) return 'good';   // healthy
        if (bf < 25) return 'good';   // optimal
        return 'bad';                 // not healthy high fat
      }

      if (sex === 'Female') {
        // Women Body Fat Levels (BF%)
        // 0–14%  Risky (too low)   → ok (yellow)
        // 14–25% Healthy           → good (green)
        // 25–32% Optimal           → good (green)
        // 32%+   Not Healthy (high)→ bad (red)
        if (bf < 14) return 'ok';     // risky low fat
        if (bf < 25) return 'good';   // healthy
        if (bf < 32) return 'good';   // optimal
        return 'bad';                 // not healthy high fat
      }

      // Generic fallback if sex is unknown: approximate between the two
      if (bf < 10) return 'ok';        // risky low fat
      if (bf < 24) return 'good';      // healthy/optimal-ish
      return 'bad';                    // high
    }

    // Lean mass: classify using LBM% = 100 - BF% (new ranges)
    if (metric === 'lean') {
      const bf = latest.BodyFat;
      const sex = this.sex;
      if (bf == null || isNaN(bf)) return 'ok';

      const leanPct = Math.max(0, Math.min(100, 100 - bf));

      if (sex === 'Male') {
        // Men LBM Levels
        // 0–70%   Not Healthy  → bad
        // 70–80%  Healthy      → good
        // 80–90%  Optimal      → good
        // 90%+    Risky        → ok (very low fat)
        if (leanPct < 70) return 'bad';
        if (leanPct < 80) return 'good';
        if (leanPct < 90) return 'good';
        return 'ok';
      }

      if (sex === 'Female') {
        // Women LBM Levels
        // 0–55%   Not Healthy  → bad
        // 55–70%  Healthy      → good
        // 70–80%  Optimal      → good
        // 80%+    Risky        → ok (very low fat)
        if (leanPct < 55) return 'bad';
        if (leanPct < 70) return 'good';
        if (leanPct < 80) return 'good';
        return 'ok';
      }

      // Generic fallback if sex is unknown
      if (leanPct < 60) return 'bad';
      if (leanPct < 75) return 'good';
      if (leanPct < 85) return 'good';
      return 'ok';
    }

    // Fat mass: classify using new BF%-based ranges
    if (metric === 'fat') {
      const bf = latest.BodyFat;
      const sex = this.sex;
      if (bf == null || isNaN(bf)) return 'ok';

      if (sex === 'Male') {
        // Men Fat Mass Levels (BF%)
        // 0–10%  Risky (too low)   → ok (yellow)
        // 10–20% Healthy           → good (green)
        // 20–30% Optimal           → good (green)
        // 30%+  Not Healthy (high) → bad (red)
        if (bf < 10) return 'ok';      // risky low fat
        if (bf < 20) return 'good';    // healthy
        if (bf < 30) return 'good';    // optimal
        return 'bad';                  // not healthy high fat
      }

      if (sex === 'Female') {
        // Women Fat Mass Levels (BF%)
        // 0–20%  Risky (too low)   → ok (yellow)
        // 20–30% Healthy           → good (green)
        // 30–45% Optimal           → good (green)
        // 45%+  Not Healthy (high) → bad (red)
        if (bf < 20) return 'ok';      // risky low fat
        if (bf < 30) return 'good';    // healthy
        if (bf < 45) return 'good';    // optimal
        return 'bad';                  // not healthy high fat
      }

      // Generic fallback (blend of the two)
      if (bf < 15) return 'ok';        // risky low fat
      if (bf < 27) return 'good';      // healthy/optimal-ish
      return 'bad';                    // clearly high
    }

    return 'ok';
  }

  dialHealthClass(metric: 'weight' | 'bodyFat' | 'lean' | 'fat'): string {
    const level = this.healthLevel(metric);
    return `dial--health-${level}`;
  }

  bodyFatStops() {
    const sex = this.sex;

    // Thresholds in %BF according to updated body-fat ranges
    // Men:   0–6 risky, 6–18 healthy, 18–25 optimal, 25+ not healthy
    // Women: 0–14 risky, 14–25 healthy, 25–32 optimal, 32+ not healthy
    let cut1: number; // upper bound of "risky"
    let cut2: number; // upper bound of "healthy"
    let cut3: number; // upper bound of "optimal"

    if (sex === 'Male') {
      cut1 = 6;
      cut2 = 18;
      cut3 = 25;
    } else if (sex === 'Female') {
      cut1 = 14;
      cut2 = 25;
      cut3 = 32;
    } else {
      // Generic blended thresholds
      cut1 = 10;
      cut2 = 22;
      cut3 = 29;
    }

    const defaultMaxDomain = 40; // default BF% range for the colored half-circle

    const bfValues = this.getSeriesValues('bodyFat');
    const bfMax = bfValues.length ? Math.max(...bfValues) : null;

    // Limit the colored domain to the smaller of the default range
    // and the actual maximum BF% for this instance. This prevents
    // coloring parts of the dial that cannot be reached by the data.
    const maxDomain = bfMax != null && bfMax > 0
      ? Math.min(defaultMaxDomain, bfMax)
      : defaultMaxDomain;

    const toPct = (v: number) => {
      const clamped = Math.max(0, Math.min(maxDomain, v));
      return (clamped / maxDomain) * 50; // 0–50% of the full circle corresponds to 0–180deg
    };

    return {
      stop1: toPct(cut1),
      stop2: toPct(cut2),
      stop3: toPct(cut3),
    };
  }

  leanStops() {
    const sex = this.sex;

    // Thresholds in %LBM according to provided ranges
    // Men:   0–70 not healthy, 70–80 healthy, 80–90 optimal, 90+ risky
    // Women: 0–55 not healthy, 55–70 healthy, 70–80 optimal, 80+ risky
    let cut1: number; // upper bound of "not healthy"
    let cut2: number; // upper bound of "healthy"
    let cut3: number; // upper bound of "optimal"

    if (sex === 'Male') {
      cut1 = 70;
      cut2 = 80;
      cut3 = 90;
    } else if (sex === 'Female') {
      cut1 = 55;
      cut2 = 70;
      cut3 = 80;
    } else {
      // Generic blended thresholds
      cut1 = 60;
      cut2 = 75;
      cut3 = 85;
    }

    const defaultMaxDomain = 100; // LBM% from 0–100 on the colored half-circle

    // Estimate the maximum LBM% that is actually reachable in this
    // dataset from the minimum BF% (LBM% = 100 - BF%).
    const bfValues = this.getSeriesValues('bodyFat');
    const minBf = bfValues.length ? Math.min(...bfValues) : null;
    const maxLeanPct = minBf != null
      ? Math.max(0, Math.min(defaultMaxDomain, 100 - minBf))
      : defaultMaxDomain;

    const maxDomain = maxLeanPct > 0 ? maxLeanPct : defaultMaxDomain;

    const toPct = (v: number) => {
      const clamped = Math.max(0, Math.min(maxDomain, v));
      return (clamped / maxDomain) * 50; // 0–50% of the full circle corresponds to 0–180deg
    };

    return {
      stop1: toPct(cut1),
      stop2: toPct(cut2),
      stop3: toPct(cut3),
    };
  }

  fatStops() {
    const sex = this.sex;

    // Thresholds in %BF for fat-mass health ranges
    // Men:   0–10 risky, 10–20 healthy, 20–30 optimal, 30+ not healthy
    // Women: 0–20 risky, 20–30 healthy, 30–45 optimal, 45+ not healthy
    let cut1: number; // upper bound of "risky"
    let cut2: number; // upper bound of "healthy"
    let cut3: number; // upper bound of "optimal"

    if (sex === 'Male') {
      cut1 = 10;
      cut2 = 20;
      cut3 = 30;
    } else if (sex === 'Female') {
      cut1 = 20;
      cut2 = 30;
      cut3 = 45;
    } else {
      // Generic blended thresholds
      cut1 = 15;
      cut2 = 25;
      cut3 = 35;
    }

    const defaultMaxDomain = 50; // default BF% range for the fat-mass colored half-circle

    const bfValues = this.getSeriesValues('bodyFat');
    const bfMax = bfValues.length ? Math.max(...bfValues) : null;

    // Again, cap the colored region to the actual maximum BF% so we
    // don't color portions of the dial that are unreachable for this user.
    const maxDomain = bfMax != null && bfMax > 0
      ? Math.min(defaultMaxDomain, bfMax)
      : defaultMaxDomain;

    const toPct = (v: number) => {
      const clamped = Math.max(0, Math.min(maxDomain, v));
      return (clamped / maxDomain) * 50; // 0–50% of the full circle corresponds to 0–180deg
    };

    return {
      stop1: toPct(cut1),
      stop2: toPct(cut2),
      stop3: toPct(cut3),
    };
  }

  canManageLogs(): boolean {
    const role = this.userRole();
    if (!role) {
      return false;
    }
    const lower = role.toLowerCase();
    return lower === 'admin' || lower === 'master';
  }

  private async loadWeightLog() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [profile, data] = await Promise.all([
        this.dietService.getProfile(),
        // No days filter: load all entries
        this.dietService.getWeightLog(),
      ]);

      const prof = profile as Profile | null;
      this.heightM = prof && prof.Height ? prof.Height / 100 : null;
      this.sex = prof ? prof.Sex : null;

      // Resolve user role name (e.g. Admin, Master) so we can gate admin-only actions
      if (prof?.role_id) {
        try {
          const userTypes = await this.dietService.getUserTypes();
          const role = userTypes.find((t) => t.ID === Number(prof.role_id));
          this.userRole.set(role ? role.Type : null);
        } catch (err) {
          console.error('Error loading user types for weight log', err);
          this.userRole.set(null);
        }
      } else {
        this.userRole.set(null);
      }

      this.entries.set(data.entries);
      this.stats.set(data.stats);
      this.recomputeDerivedMetrics();
    } catch (err) {
      console.error('Error loading weight log', err);
      this.error.set('Failed to load weight log data.');
    } finally {
      this.loading.set(false);
    }
  }

  private recomputeDerivedMetrics() {
    const entries = this.entries();

    if (!entries.length) {
      this.enrichedEntries.set([]);
      return;
    }

    const heightM = this.heightM;

    // Use the oldest log as baseline for deltas
    const sortedByDate = [...entries].sort((a, b) => a.EntryDate.localeCompare(b.EntryDate));
    const first = sortedByDate[0];
    const firstLean =
      first.BodyFat != null
        ? first.Weight * (1 - first.BodyFat / 100)
        : null;
    const firstFat =
      first.BodyFat != null
        ? first.Weight * (first.BodyFat / 100)
        : null;

    const parseDate = (d: string) => {
      const [y, m, day] = d.split('-').map((v) => parseInt(v, 10));
      return new Date(y, m - 1, day);
    };

    const toDate = (e: WeightLogEntry) => parseDate(e.EntryDate);

    const inRange = (d: Date, start: Date, finish: Date) =>
      d >= start && d <= finish;

    const avg = (values: (number | null | undefined)[]) => {
      const nums = values.filter((v): v is number => v != null && !isNaN(v));
      if (!nums.length) return null;
      const sum = nums.reduce((s, v) => s + v, 0);
      return sum / nums.length;
    };

    const enriched = entries.map((e) => {
      const leanMass =
        e.BodyFat != null
          ? e.Weight * (1 - e.BodyFat / 100)
          : null;
      const fatMass =
        e.BodyFat != null
          ? e.Weight * (e.BodyFat / 100)
          : null;

      const leanDelta =
        leanMass != null && firstLean != null ? leanMass - firstLean : null;
      const fatDelta =
        fatMass != null && firstFat != null ? fatMass - firstFat : null;

      const bmi =
        heightM && heightM > 0
          ? e.Weight / (heightM * heightM)
          : null;
      const ffmi =
        heightM && heightM > 0 && leanMass != null
          ? leanMass / (heightM * heightM)
          : null;

      const date = toDate(e);
      const startCurrent = new Date(date);
      startCurrent.setDate(date.getDate() - 6);
      const endCurrent = date;
      const endPrev = new Date(startCurrent);
      endPrev.setDate(startCurrent.getDate() - 1);
      const startPrev = new Date(endPrev);
      startPrev.setDate(endPrev.getDate() - 6);

      const windowCurrent = entries.filter((x) => {
        const d = toDate(x);
        return inRange(d, startCurrent, endCurrent);
      });

      const windowPrev = entries.filter((x) => {
        const d = toDate(x);
        return inRange(d, startPrev, endPrev);
      });

      const avgWeight7 = avg(windowCurrent.map((w) => w.Weight));
      const prevAvgWeight = avg(windowPrev.map((w) => w.Weight));
      const diffPrevWeek =
        avgWeight7 != null && prevAvgWeight != null
          ? avgWeight7 - prevAvgWeight
          : null;

      const bfAvg = avg(windowCurrent.map((w) => w.BodyFat));
      const bmiAvg = avg(windowCurrent.map((w) => {
        const dLean =
          w.BodyFat != null ? w.Weight * (1 - w.BodyFat / 100) : null;
        return heightM && heightM > 0
          ? w.Weight / (heightM * heightM)
          : null;
      }));

      const leanAvg = avg(windowCurrent.map((w) => {
        const dLean =
          w.BodyFat != null ? w.Weight * (1 - w.BodyFat / 100) : null;
        return dLean;
      }));

      const leanDeltaAvg = avg(windowCurrent.map((w) => {
        const dLean =
          w.BodyFat != null ? w.Weight * (1 - w.BodyFat / 100) : null;
        return dLean != null && firstLean != null ? dLean - firstLean : null;
      }));

      const fatAvg = avg(windowCurrent.map((w) => {
        const dFat =
          w.BodyFat != null ? w.Weight * (w.BodyFat / 100) : null;
        return dFat;
      }));

      const fatDeltaAvg = avg(windowCurrent.map((w) => {
        const dFat =
          w.BodyFat != null ? w.Weight * (w.BodyFat / 100) : null;
        return dFat != null && firstFat != null ? dFat - firstFat : null;
      }));

      const ffmiAvg = avg(windowCurrent.map((w) => {
        const dLean =
          w.BodyFat != null ? w.Weight * (1 - w.BodyFat / 100) : null;
        return heightM && heightM > 0 && dLean != null
          ? dLean / (heightM * heightM)
          : null;
      }));

      return {
        ...e,
        LeanMass: e.LeanMass ?? leanMass,
        leanDelta,
        fatMass,
        fatDelta,
        bmi,
        ffmi,
        avgWeight7,
        diffPrevWeek,
        bfAvg,
        bmiAvg,
        leanAvg,
        leanDeltaAvg,
        fatAvg,
        fatDeltaAvg,
        ffmiAvg,
      };
    });

    this.enrichedEntries.set(enriched);
  }

  startEdit(entry: WeightLogEntry) {
    this.editingId.set(entry.ID);
    this.editWeight.set(entry.Weight);
    this.editBodyFat.set(entry.BodyFat ?? null);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editWeight.set(null);
    this.editBodyFat.set(null);
  }

  async saveEdit(entry: WeightLogEntry) {
    const weight = this.editWeight();
    const bodyFat = this.editBodyFat();
    if (weight == null || isNaN(weight)) {
      this.snackBar.open('Weight is required for update', 'Close', { duration: 2500 });
      return;
    }

    try {
      await this.dietService.updateWeightLog(entry.ID, { weight, bodyFat: bodyFat ?? null });
      this.snackBar.open('Weight entry updated', 'Close', { duration: 2500 });
      this.cancelEdit();
      await this.loadWeightLog();
    } catch (err) {
      console.error('Error updating weight entry', err);
      this.error.set('Failed to update weight entry.');
      this.snackBar.open('Failed to update weight entry', 'Close', { duration: 3000 });
    }
  }

  async deleteEntry(entry: WeightLogEntry) {
    const confirmed = window.confirm('Delete this weight log entry?');
    if (!confirmed) return;

    try {
      await this.dietService.deleteWeightLog(entry.ID);
      this.snackBar.open('Weight entry deleted', 'Close', { duration: 2500 });
      await this.loadWeightLog();
    } catch (err) {
      console.error('Error deleting weight entry', err);
      this.error.set('Failed to delete weight entry.');
      this.snackBar.open('Failed to delete weight entry', 'Close', { duration: 3000 });
    }
  }

  async deleteAllEntries() {
    if (!this.canManageLogs()) {
      this.snackBar.open('Only Admin or Master can delete all logs.', 'Close', { duration: 3000 });
      return;
    }

    const confirmed = window.confirm('Delete ALL weight log entries for this user? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      const result = await this.dietService.deleteAllWeightLogs();
      this.snackBar.open(result.message || 'All weight log entries deleted', 'Close', { duration: 4000 });
      await this.loadWeightLog();
    } catch (err) {
      console.error('Error deleting all weight entries', err);
      this.error.set('Failed to delete all weight entries.');
      this.snackBar.open('Failed to delete all weight entries', 'Close', { duration: 4000 });
    }
  }

  async addEntry() {
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    try {
      const value = this.logForm.value;
      if (!value.date || value.weight == null) {
        return;
      }

      let dateStr: string;
      if (value.date instanceof Date) {
        const d = value.date;
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        dateStr = value.date as unknown as string;
      }

      await this.dietService.addWeightLog({
        date: dateStr,
        weight: value.weight,
        bodyFat: value.bodyFat ?? null
      });

      this.snackBar.open('Weight entry added', 'Close', { duration: 2500 });

      // Keep the date, clear the numeric fields
      this.logForm.patchValue({ weight: null, bodyFat: null });

      await this.loadWeightLog();
    } catch (err) {
      console.error('Error adding weight entry', err);
      this.error.set('Failed to add weight entry.');
      this.snackBar.open('Failed to add weight entry', 'Close', { duration: 3000 });
    }
  }

  async generateSampleData() {
    if (!this.canManageLogs()) {
      this.snackBar.open('Only Admin or Master can generate sample data.', 'Close', { duration: 3000 });
      return;
    }

    try {
      const startWeightStr = window.prompt('Begin weight (kg) at the start of the period:');
      if (startWeightStr == null) {
        return; // cancelled
      }
      const startWeight = parseFloat(startWeightStr.replace(',', '.'));
      if (!isFinite(startWeight) || startWeight <= 0) {
        this.snackBar.open('Please enter a valid begin weight.', 'Close', { duration: 3000 });
        return;
      }

      const endWeightStr = window.prompt('End weight (kg) today:');
      if (endWeightStr == null) {
        return; // cancelled
      }
      const endWeight = parseFloat(endWeightStr.replace(',', '.'));
      if (!isFinite(endWeight) || endWeight <= 0) {
        this.snackBar.open('Please enter a valid end weight.', 'Close', { duration: 3000 });
        return;
      }

      const startBfStr = window.prompt('Begin body fat % at the start of the period:');
      if (startBfStr == null) {
        return; // cancelled
      }
      const startBodyFat = parseFloat(startBfStr.replace(',', '.'));
      if (!isFinite(startBodyFat) || startBodyFat < 0 || startBodyFat > 100) {
        this.snackBar.open('Please enter a valid begin body fat percentage (0–100).', 'Close', { duration: 3000 });
        return;
      }

      const endBfStr = window.prompt('End body fat % today:');
      if (endBfStr == null) {
        return; // cancelled
      }
      const endBodyFat = parseFloat(endBfStr.replace(',', '.'));
      if (!isFinite(endBodyFat) || endBodyFat < 0 || endBodyFat > 100) {
        this.snackBar.open('Please enter a valid end body fat percentage (0–100).', 'Close', { duration: 3000 });
        return;
      }

      const monthsStr = window.prompt('Number of months to cover (end date is today):', '3');
      if (monthsStr == null) {
        return; // cancelled
      }
      const months = parseInt(monthsStr, 10);
      if (!Number.isFinite(months) || months <= 0) {
        this.snackBar.open('Please enter a valid number of months (> 0).', 'Close', { duration: 3000 });
        return;
      }

      const confirmed = window.confirm(
        'This will DELETE ALL existing weight log entries and then generate daily log entries with a smooth trend from the begin values to the end values over the selected months. Continue?'
      );
      if (!confirmed) {
        return;
      }

      // Wipe all existing data before generating the new sample set
      await this.dietService.deleteAllWeightLogs();

      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const startDate = new Date(todayMidnight);
      startDate.setMonth(startDate.getMonth() - months);

      const msPerDay = 24 * 60 * 60 * 1000;
      const totalDays = Math.floor((todayMidnight.getTime() - startDate.getTime()) / msPerDay) + 1;
      if (totalDays <= 0) {
        this.snackBar.open('Could not determine a valid date range for generation.', 'Close', { duration: 3000 });
        return;
      }

      let createdCount = 0;
      this.loading.set(true);

      for (let i = 0; i < totalDays; i++) {
        const dayDate = new Date(startDate.getTime() + i * msPerDay);
        const year = dayDate.getFullYear();
        const month = String(dayDate.getMonth() + 1).padStart(2, '0');
        const day = String(dayDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const t = totalDays > 1 ? i / (totalDays - 1) : 0; // 0..1

        // Linear interpolation between begin and end, plus a bit of noise
        let weight = startWeight + t * (endWeight - startWeight);
        let bodyFat = startBodyFat + t * (endBodyFat - startBodyFat);

        weight += (Math.random() - 0.5) * 0.4; // ±0.2 kg noise
        bodyFat += (Math.random() - 0.5) * 0.4; // ±0.2 % noise

        weight = Math.max(40, weight);
        bodyFat = Math.min(100, Math.max(3, bodyFat));

        await this.dietService.addWeightLog({
          date: dateStr,
          weight,
          bodyFat,
        });
        createdCount++;
      }

      // Rebuild weekly analytics for the current user based on the new sample data
      try {
        await this.dietService.rebuildAnalytics();
      } catch (rebuildErr) {
        console.error('Failed to rebuild analytics after sample generation', rebuildErr);
      }

      await this.loadWeightLog();

      this.snackBar.open(`Cleared existing data, generated ${createdCount} weight log entries, and rebuilt analytics.`, 'Close', { duration: 3500 });
    } catch (err) {
      console.error('Error generating sample weight log data', err);
      this.error.set('Failed to generate sample weight log data.');
      this.snackBar.open('Failed to generate sample weight log data.', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }
}
