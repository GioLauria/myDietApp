import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DietService } from '../../services/diet';

interface ApiRoute {
  path: string;
  method: string;
  description: string;
  area?: string;
}

@Component({
  selector: 'app-api-routes',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './api-routes.html',
  styleUrl: './api-routes.scss'
})
export class ApiRoutes implements OnInit {
  private dietService = inject(DietService);
  
  routes = signal<ApiRoute[]>([]);
  groupedRoutes = signal<{ area: string; routes: ApiRoute[] }[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  userRole = signal<string | null>(null);
  downloading = signal<boolean>(false);
  displayedColumns: string[] = ['method', 'path', 'description'];
  selectedArea = signal<string>('All');

  async ngOnInit() {
    try {
      // Load profile to determine role and gate admin-only actions
      try {
        const profile = await this.dietService.getProfile();
        if (profile?.role_id) {
          const userTypes = await this.dietService.getUserTypes();
          const role = userTypes.find(t => t.ID === Number(profile.role_id));
          this.userRole.set(role ? role.Type : null);
        }
      } catch (profileErr) {
        console.error('Error loading profile/user types for API routes', profileErr);
        this.userRole.set(null);
      }

      const routes = await this.dietService.getApiRoutes();
      this.routes.set(routes);
      this.groupedRoutes.set(this.buildGroups(routes));
    } catch (err: any) {
      console.error('Error loading API routes:', err);
      this.error.set('Failed to load API routes. You might not have permission.');
    } finally {
      this.loading.set(false);
    }
  }

  canExportPostman(): boolean {
    const role = this.userRole();
    if (!role) return false;
    const lower = role.toLowerCase();
    return lower === 'admin' || lower === 'master';
  }

  async exportPostmanCollection() {
    if (!this.canExportPostman() || this.downloading()) {
      return;
    }

    try {
      this.downloading.set(true);
      const blob = await this.dietService.downloadPostmanCollection();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MyDietApp.postman_collection.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download Postman collection', err);
      this.error.set('Failed to generate Postman collection. You might not have permission.');
    } finally {
      this.downloading.set(false);
    }
  }

  get areas(): string[] {
    return this.groupedRoutes().map(g => g.area);
  }

  get visibleGroups(): { area: string; routes: ApiRoute[] }[] {
    const selected = this.selectedArea();
    const groups = this.groupedRoutes();
    if (selected === 'All') {
      return groups;
    }
    return groups.filter(g => g.area === selected);
  }

  selectArea(area: string) {
    this.selectedArea.set(area);
  }

  private buildGroups(routes: ApiRoute[]): { area: string; routes: ApiRoute[] }[] {
    const map = new Map<string, ApiRoute[]>();

    for (const r of routes) {
      const area = this.categorizeRoute(r);
      if (!map.has(area)) {
        map.set(area, []);
      }
      map.get(area)!.push(r);
    }

    const order: Record<string, number> = {
      'Analytics': 1,
      'Weight Logs': 2,
      'Meal Plan': 3,
      'Food DB': 4,
      'Admin DB': 5,
      'Admin': 6,
      'Other': 99
    };

    return Array.from(map.entries())
      .sort(([a], [b]) => (order[a] ?? 98) - (order[b] ?? 98) || a.localeCompare(b))
      .map(([area, rs]) => ({
        area,
        routes: rs.slice().sort((r1, r2) => {
          const areaCmp = (r1.path || '').localeCompare(r2.path || '');
          if (areaCmp !== 0) return areaCmp;
          return (r1.method || '').localeCompare(r2.method || '');
        })
      }));
  }

  private categorizeRoute(route: ApiRoute): string {
    const path = route.path || '';

    // Main app areas (keep aligned with menu): Analytics, Weight Logs, Meal Plan, Food DB
    if (path.startsWith('/api/weight-log')) {
      return 'Weight Logs';
    }

    if (
      path === '/api/profile' ||
      path === '/api/diet-phases' ||
      path.startsWith('/api/analytics')
    ) {
      return 'Analytics';
    }

    if (path.startsWith('/api/meals') || path.startsWith('/api/meal-plan') || path.startsWith('/api/meal-types')) {
      return 'Meal Plan';
    }

    if (path.startsWith('/api/foods') || path.startsWith('/api/categories')) {
      return 'Food DB';
    }

    // Admin endpoints
    if (path.startsWith('/api/admin/tables') || path.startsWith('/api/admin/query')) {
      return 'Admin DB';
    }

    if (path.startsWith('/api/admin')) {
      return 'Admin';
    }

    return 'Other';
  }
}
