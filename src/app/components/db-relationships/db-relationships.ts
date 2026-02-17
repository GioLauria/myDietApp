import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-db-relationships',
  standalone: true,
  imports: [CommonModule, MatCardModule, DragDropModule],
  templateUrl: './db-relationships.html',
  styleUrl: './db-relationships.scss'
})
export class DbRelationships {
  tables = [
    {
      name: 'tblProfile',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'Name', type: 'string' },
        { name: 'Surname', type: 'string' },
        { name: 'Email', type: 'string' },
        { name: 'Height', type: 'float' },
        { name: 'DateOfBirth', type: 'date' },
        { name: 'Sex', type: 'Male/Female' },
        { name: 'Activity', type: 'int' },
        { name: 'role_id', type: 'int', role: 'FK' },
        { name: 'ColorScheme', type: 'string' },
        { name: 'FontFamily', type: 'string' },
        { name: 'FontSize', type: 'float' },
      ],
    },
    {
      name: 'tblUserType',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'Type', type: 'string' },
      ],
    },
    {
      name: 'tblFoodCategories',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'Category', type: 'string' },
        { name: 'created_by', type: 'int', role: 'FK' },
      ],
    },
    {
      name: 'tblFood',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'Food', type: 'string' },
        { name: 'Protein', type: 'float' },
        { name: 'Carbs', type: 'float' },
        { name: 'Fat', type: 'float' },
        { name: 'Calories', type: 'float' },
        { name: 'ID_Category', type: 'int', role: 'FK' },
        { name: 'created_by', type: 'int', role: 'FK' },
      ],
    },
    {
      name: 'tblWeight',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'EntryDate', type: 'datetime' },
        { name: 'Weight', type: 'float' },
        { name: 'BodyFat', type: 'float' },
        { name: 'created_by', type: 'int', role: 'FK' },
      ],
    },
    {
      name: 'tblDietPhase',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'profile_id', type: 'int', role: 'FK' },
        { name: 'PhaseKey', type: 'string' },
        { name: 'ProteinPerKgLean', type: 'float' },
        { name: 'FatPerKgBody', type: 'float' },
        { name: 'CalorieOffset', type: 'int' },
      ],
    },
    {
      name: 'tblAnalytics',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'profile_id', type: 'int', role: 'FK' },
        { name: 'WeekStart', type: 'date' },
        { name: 'WeekNumber', type: 'int' },
        { name: 'Workout', type: 'Y/N' },
        { name: 'PhaseKey', type: 'int', role: 'FK' },
      ],
    },
    {
      name: 'tblMealSlot',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'Name', type: 'string' },
        { name: 'IsMain', type: 'bool' },
      ],
    },
    {
      name: 'tblMealPlan',
      columns: [
        { name: 'ID', type: 'int', role: 'PK' },
        { name: 'profile_id', type: 'int', role: 'FK' },
        { name: 'PlanDate', type: 'datetime' },
        { name: 'AnalyticsID', type: 'int', role: 'FK' },
        { name: 'SlotID', type: 'int', role: 'FK' },
        { name: 'FoodID', type: 'int', role: 'FK' },
      ],
    },
  ];

  relations = [
    { from: 'tblProfile.role_id', to: 'tblUserType.ID', label: 'Profile has role' },
    { from: 'tblFoodCategories.created_by', to: 'tblProfile.ID', label: 'Category created by user' },
    { from: 'tblFood.ID_Category', to: 'tblFoodCategories.ID', label: 'Food belongs to category' },
    { from: 'tblFood.created_by', to: 'tblProfile.ID', label: 'Food created by user' },
    { from: 'tblWeight.created_by', to: 'tblProfile.ID', label: 'Weight entry created by user' },
    { from: 'tblDietPhase.profile_id', to: 'tblProfile.ID', label: 'Diet phases per profile' },
    { from: 'tblAnalytics.profile_id', to: 'tblProfile.ID', label: 'Weekly analytics per profile' },
    { from: 'tblAnalytics.PhaseKey', to: 'tblDietPhase.ID', label: 'Analytics phase references diet phase (by ID)' },
    { from: 'tblMealPlan.profile_id', to: 'tblProfile.ID', label: 'Saved meal plans per profile' },
    { from: 'tblMealPlan.SlotID', to: 'tblMealSlot.ID', label: 'Meal plan rows reference meal slots' },
    { from: 'tblMealPlan.FoodID', to: 'tblFood.ID', label: 'Meal plan rows reference foods' },
  ];
}
