import { Routes } from '@angular/router';
import { Analytics } from './components/analytics/analytics';
import { WeightLog } from './components/weight-log/weight-log';
import { MealPlan } from './components/meal-plan/meal-plan';
import { FoodDb } from './components/food-db/food-db';
import { ProfileComponent } from './components/profile/profile';
import { AdminDb } from './components/admin-db/admin-db';
import { DbRelationships } from './components/db-relationships/db-relationships';
import { ApiRoutes } from './components/api-routes/api-routes';
import { UserManual } from './components/user-manual/user-manual';
import { Changelog } from './components/changelog/changelog';

export const routes: Routes = [
  { path: '', redirectTo: '/analytics', pathMatch: 'full' },
  { path: 'analytics', component: Analytics },
  { path: 'weight-log', component: WeightLog },
  { path: 'meal-plan', component: MealPlan },
  { path: 'food-db', component: FoodDb },
  { path: 'profile', component: ProfileComponent },
  { path: 'admin-db', component: AdminDb },
  { path: 'db-relationships', component: DbRelationships },
  { path: 'api-routes', component: ApiRoutes },
  { path: 'help', component: UserManual },
  { path: 'changelog', component: Changelog },
];
