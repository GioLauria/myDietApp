import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatProgressBarModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  // Static placeholders now that tblMeal and meals are removed
  dailyGoal = 2000;
  totalCalories = computed(() => 0);
  progress = computed(() => 0);
}
