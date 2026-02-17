import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { DietService } from '../../services/diet';

@Component({
  selector: 'app-admin-db',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    MatExpansionModule
  ],
  templateUrl: './admin-db.html',
  styleUrl: './admin-db.scss'
})
export class AdminDb {
  private dietService = inject(DietService);

  protected tables = signal<string[]>([]);
  protected selectedTable = signal<string>('');
  protected query = signal<string>('');
  protected queryResult = signal<any[]>([]);
  protected queryColumns = signal<string[]>([]);
  protected error = signal<string>('');
  protected successMessage = signal<string>('');

  async ngOnInit() {
    await this.loadTables();
  }

  async loadTables() {
    try {
      const tables = await this.dietService.getDbTables();
      this.tables.set(tables);
    } catch (err) {
      this.error.set('Failed to load tables');
    }
  }

  async onTableSelect(tableName: string) {
    this.selectedTable.set(tableName);
    // For tblFood show a more explicit column list including the new Meal column
    if (tableName === 'tblFood') {
      // Show MealId and join hint - use JOIN to see the textual meal name from tblMealType
      this.query.set(`SELECT f.ID, f.Food, f.Protein, f.Carbs, f.Fat, f.Calories, f.ID_Category, f.MealId, m.Meal AS MealType FROM ${tableName} f LEFT JOIN tblMealType m ON f.MealId = m.ID LIMIT 100`);
    } else {
      this.query.set(`SELECT * FROM ${tableName} LIMIT 100`);
    }
    await this.executeQuery();
  }

  async executeQuery() {
    this.error.set('');
    this.successMessage.set('');
    this.queryResult.set([]);
    this.queryColumns.set([]);

    if (!this.query().trim()) return;

    try {
      const result = await this.dietService.executeDbQuery(this.query());
      
      if (Array.isArray(result)) {
        this.queryResult.set(result);
        if (result.length > 0) {
          this.queryColumns.set(Object.keys(result[0]));
        }
        this.successMessage.set(`Query executed successfully. ${result.length} rows returned.`);
      } else {
        // Handle non-select queries (metadata)
        let msg = 'Query executed successfully.';
        if (result && typeof result === 'object') {
             // Try to display something if it's an object but not an array
             this.queryResult.set([result]);
             this.queryColumns.set(Object.keys(result));
             
             if ('changes' in result) {
                msg += ` ${result.changes} rows affected.`;
             }
        }
        this.successMessage.set(msg);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Query execution failed');
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'Enter') {
      this.executeQuery();
    }
  }
}
