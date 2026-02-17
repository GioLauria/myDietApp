import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { DietService } from './services/diet';
import { ThemeService } from './services/theme';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    MatToolbarModule, 
    MatSidenavModule, 
    MatListModule, 
    MatButtonModule, 
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('My Diet App');
  protected readonly userName = signal<string>('');
  protected readonly userRole = signal<string>('');
  
  private dietService = inject(DietService);
  private themeService = inject(ThemeService);

  ngOnInit() {
    this.loadUserInfo();
  }

  async loadUserInfo() {
    try {
      const [profile, userTypes] = await Promise.all([
        this.dietService.getProfile(),
        this.dietService.getUserTypes()
      ]);

      if (profile) {
        this.userName.set(`${profile.Name} ${profile.Surname}`);
        if (profile.role_id) {
          const role = userTypes.find(t => t.ID === Number(profile.role_id));
          if (role) {
            this.userRole.set(role.Type);
          }
        }
        this.themeService.applyProfilePreferences(profile);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }
}
