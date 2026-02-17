import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { Food, FoodCategory, MealType } from '../../services/diet';

export interface FoodDetailsData {
  food: Food;
}

@Component({
  selector: 'app-food-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatListModule],
  template: `
    <h2 mat-dialog-title>{{ data.food.Food }}</h2>
    <mat-dialog-content>
      <mat-list>
        <mat-list-item>Calories: <strong style="margin-left:6px">{{ data.food.Calories }}</strong></mat-list-item>
        <mat-list-item>Protein (g): <strong style="margin-left:6px">{{ data.food.Protein }}</strong></mat-list-item>
        <mat-list-item>Carbs (g): <strong style="margin-left:6px">{{ data.food.Carbs }}</strong></mat-list-item>
        <mat-list-item>Fat (g): <strong style="margin-left:6px">{{ data.food.Fat }}</strong></mat-list-item>
        <mat-list-item *ngIf="data.food.FoodCategory">Category: <strong style="margin-left:6px">{{ data.food.FoodCategory.Category }}</strong></mat-list-item>
        <mat-list-item *ngIf="data.food.MealType">Meal: <strong style="margin-left:6px">{{ data.food.MealType.Meal }}</strong></mat-list-item>
      </mat-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Close</button>
    </mat-dialog-actions>
  `
})
export class FoodDetailsDialog {
  data = inject<FoodDetailsData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FoodDetailsDialog>);

  close() {
    this.dialogRef.close();
  }
}
