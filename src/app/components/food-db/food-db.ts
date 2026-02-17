import { Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DietService, FoodCategory, Food, Profile, UserType, MealType } from '../../services/diet';
import { FoodDialog } from './food-dialog';

@Component({
  selector: 'app-food-db',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './food-db.html',
  styleUrl: './food-db.scss',
})
export class FoodDb implements OnInit {
  private dietService = inject(DietService);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);
  
  categories = signal<FoodCategory[]>([]);
  mealTypes = signal<MealType[]>([]);
  selectedCategory = signal<FoodCategory | null>(null);
  foods = signal<Food[]>([]);
  error = signal<string | null>(null);
  
  currentUser = signal<Profile | null>(null);
  userRole = signal<string>('');

  searchControl = new FormControl('');

  constructor() {
    this.setupSearch();
  }

  async ngOnInit() {
    await Promise.all([
      this.loadCategories(),
      this.loadUserProfile(),
      this.loadMealTypes()
    ]);
  }

  async loadMealTypes() {
    try {
      const mts = await this.dietService.getMealTypes();
      this.mealTypes.set(mts);
    } catch (err) {
      console.error('Failed to load meal types', err);
    }
  }

  async loadUserProfile() {
    try {
      const [profile, userTypes] = await Promise.all([
        this.dietService.getProfile(),
        this.dietService.getUserTypes()
      ]);
      this.currentUser.set(profile);
      if (profile && profile.role_id) {
        const role = userTypes.find(t => t.ID === profile.role_id);
        this.userRole.set(role ? role.Type : '');
      }
    } catch (err) {
      console.error('Error loading profile', err);
    }
  }

  canEdit(food: Food): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    const role = this.userRole().toLowerCase();
    if (role === 'master' || role === 'admin') return true;
    
    return food.created_by === user.ID;
  }

  canEditCategory(category: FoodCategory): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    const role = this.userRole().toLowerCase();
    if (role === 'master' || role === 'admin') return true;
    
    return category.created_by === user.ID;
  }

  async addCategory() {
    const name = prompt('Enter new category name:');
    if (!name) return;

    try {
      await this.dietService.addCategory({ Category: name });
      await this.loadCategories();
    } catch (err) {
      console.error('Error adding category', err);
      this.error.set('Failed to add category.');
    }
  }

  openFoodDialog(food?: Food) {
    const dialogRef = this.dialog.open(FoodDialog, {
      data: {
        food,
        categories: this.categories()
        ,mealTypes: this.mealTypes()
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          if (food) {
            await this.dietService.updateFood(food.ID, result);
            // Refresh list based on current view
            if (this.selectedCategory()) {
              this.selectCategory(this.selectedCategory()!);
            } else if (this.searchControl.value) {
               const query = this.searchControl.value;
               const foods = await this.dietService.searchFoods(query);
               this.foods.set(foods);
            }
          } else {
            await this.dietService.addFood(result);
            // Switch to the category of the new food to show it
            const categoryId = result.ID_Category;
            const category = this.categories().find(c => c.ID === categoryId);
            if (category) {
                this.selectCategory(category);
            }
          }
        } catch (err) {
          console.error('Error saving food', err);
          this.error.set('Failed to save food.');
        }
      }
    });
  }

  async deleteFood(food: Food) {
    if (!confirm(`Are you sure you want to delete ${food.Food}?`)) return;
    
    try {
      await this.dietService.deleteFood(food.ID);
      // Refresh list
      if (this.selectedCategory()) {
        this.selectCategory(this.selectedCategory()!);
      } else if (this.searchControl.value) {
         const query = this.searchControl.value;
         const foods = await this.dietService.searchFoods(query);
         this.foods.set(foods);
      }
    } catch (err) {
      console.error('Error deleting food', err);
      this.error.set('Failed to delete food.');
    }
  }

  setupSearch() {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 2) {
          this.selectedCategory.set(null); // Clear category selection
          return this.dietService.searchFoods(value);
        } else {
          return of([]);
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (foods) => {
        if (this.searchControl.value && this.searchControl.value.length >= 2) {
             this.foods.set(foods);
        }
      },
      error: (err) => {
        console.error('Search error:', err);
        this.error.set('Search failed.');
      }
    });
  }

  async loadCategories() {
    try {
      const categories = await this.dietService.getCategories();
      // Sort categories alphabetically by name
      categories.sort((a, b) => a.Category.localeCompare(b.Category));
      // Ensure 'No Category' appears first in the list if present
      const idx = categories.findIndex(c => String(c.Category).toLowerCase() === 'no category');
      if (idx > 0) {
        const [noCat] = categories.splice(idx, 1);
        categories.unshift(noCat);
      }
      this.categories.set(categories);
      this.error.set(null);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      this.error.set('Failed to load categories. Please ensure the server is running.');
    }
  }

  async selectCategory(category: FoodCategory) {
    try {
      this.selectedCategory.set(category);
      this.searchControl.setValue(''); // Clear search
      const foods = await this.dietService.getFoodsByCategory(category.ID);
      this.foods.set(foods);
      this.error.set(null);
    } catch (err: any) {
      console.error('Error loading foods:', err);
      this.error.set('Failed to load foods for this category.');
    }
  }
}
