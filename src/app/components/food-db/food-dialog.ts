import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Food, FoodCategory, MealType } from '../../services/diet';

export interface FoodDialogData {
  food?: Food;
  categories: FoodCategory[];
  mealTypes?: MealType[];
}

@Component({
  selector: 'app-food-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.food ? 'Edit Food' : 'Add Food' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="food-form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="Food">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="ID_Category">
            <mat-option *ngFor="let cat of data.categories" [value]="cat.ID">
              {{ cat.Category }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="macros-row">
          <mat-form-field appearance="outline">
            <mat-label>Protein (g)</mat-label>
            <input matInput type="number" formControlName="Protein">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Carbs (g)</mat-label>
            <input matInput type="number" formControlName="Carbs">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fat (g)</mat-label>
            <input matInput type="number" formControlName="Fat">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Calories</mat-label>
          <input matInput type="number" formControlName="Calories">
        </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Meal (optional)</mat-label>
              <mat-select formControlName="MealId">
                <mat-option [value]="null">(Any)</mat-option>
                <mat-option *ngFor="let m of data.mealTypes || []" [value]="m.ID">{{ m.Meal }}</mat-option>
              </mat-select>
            </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .food-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 400px;
      padding-top: 10px;
    }
    .macros-row {
      display: flex;
      gap: 10px;
      mat-form-field { flex: 1; }
    }
  `]
})
export class FoodDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<FoodDialog>);
  data = inject<FoodDialogData>(MAT_DIALOG_DATA);

  form = this.fb.group({
    Food: [this.data.food?.Food || '', Validators.required],
    ID_Category: [this.data.food?.ID_Category || null, Validators.required],
    Protein: [this.data.food?.Protein || 0, [Validators.required, Validators.min(0)]],
    Carbs: [this.data.food?.Carbs || 0, [Validators.required, Validators.min(0)]],
    Fat: [this.data.food?.Fat || 0, [Validators.required, Validators.min(0)]],
    Calories: [this.data.food?.Calories || 0, [Validators.required, Validators.min(0)]],
    MealId: [this.data.food?.MealId ?? null]
  });

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
