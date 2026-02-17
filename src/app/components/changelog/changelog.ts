import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface ChangeEntry {
  title: string;
  details: string[];
}

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './changelog.html',
  styleUrl: './changelog.scss',
})
export class Changelog {
  recentChanges: ChangeEntry[] = [
    {
      title: 'Meal planning and targets',
      details: [
        'Meal Plan page now shows current week targets (kcal, protein, fat, carbs) based on analytics.',
        'You can generate a random daily meal plan (Breakfast, Snack 1, Lunch, Snack 2, Dinner, Snack 3) from the Food DB.',
        'The generator aims to match your calorie and macro targets within about 2% when possible, using an improved algorithm.',
      ],
    },
    {
      title: 'Analytics improvements',
      details: [
        'Weekly analytics matrix is horizontally scrollable with adjustable column width.',
        'Workout and Phase are compact, borderless selects; only the latest week is editable and is highlighted in red.',
        'Week headers now show "Week N" on the first line and the week start date on the second.',
      ],
    },
    {
      title: 'Analytics data model',
      details: [
        'Introduced tblAnalytics to persist weekly analytics per user, including BMR, target kcal, macros, and FFMI.',
        'Analytics phases now reference tblDietPhase by ID and are kept in sync when you change phases.',
        'Added a rebuild action so analytics can be recomputed from the weight log when sample data is generated or logs are cleared.',
      ],
    },
    {
      title: 'Admin tools and API',
      details: [
        'DB Relationships page now includes an interactive, draggable layout of tables.',
        'API Routes page lists analytics and rebuild endpoints and offers a Postman collection export for Master/Admin users.',
        'Cleaned up unused backend helper scripts to simplify the server folder.',
      ],
    },
  ];
}
