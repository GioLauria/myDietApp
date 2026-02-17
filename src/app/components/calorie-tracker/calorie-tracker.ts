import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-calorie-tracker',
  imports: [
    CommonModule, 
    FormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './calorie-tracker.html',
  styleUrl: './calorie-tracker.scss',
})
export class CalorieTracker {
  name = '';
  calories: number | null = null;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' = 'Snack';

  addMeal() {
    if (this.name && this.calories) {
      this.name = '';
      this.calories = null;
      this.type = 'Snack';
    }
  }
}
