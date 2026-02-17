import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DietService, Profile, UserType } from '../../services/diet';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  private dietService = inject(DietService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  userTypes = signal<UserType[]>([]);
  currentRole = signal<string | null>(null);
  private hasExistingProfile = false;
  private appearanceSaveTimeout: any;

  profileForm = this.fb.group({
    Name: ['', Validators.required],
    Surname: ['', Validators.required],
    Email: ['', [Validators.required, Validators.email]],
    Height: [0, [Validators.required, Validators.min(0)]],
    DateOfBirth: ['', Validators.required],
    Sex: ['Male', Validators.required],
    Activity: [0, Validators.required],
    role_id: [null as number | null, Validators.required],
    ColorScheme: ['default'],
    FontFamily: ['system'],
    FontSize: [12]
  });

  activityLevels = [
    { value: 0, label: 'Sedentary (little or no exercise)' },
    { value: 1, label: 'Lightly active (light exercise/sports 1-3 days/week)' },
    { value: 2, label: 'Moderately active (moderate exercise/sports 3-5 days/week)' },
    { value: 3, label: 'Very active (hard exercise/sports 6-7 days/week)' },
    { value: 4, label: 'Extra active (very hard exercise/sports & physical job)' }
  ];

  constructor() {
    this.loadUserTypes().then(() => this.loadProfile());
    
    this.profileForm.get('role_id')?.valueChanges.subscribe(roleId => {
      this.updateCurrentRole(roleId);
    });

    // Live-apply appearance changes and auto-save them
    ['ColorScheme', 'FontFamily', 'FontSize'].forEach(key => {
      this.profileForm.get(key)?.valueChanges.subscribe(() => {
        this.onAppearanceChanged();
      });
    });
  }

  async loadUserTypes() {
    try {
      const types = await this.dietService.getUserTypes();
      this.userTypes.set(types);
    } catch (error) {
      console.error('Error loading user types', error);
    }
  }

  async loadProfile() {
    try {
      const profile = await this.dietService.getProfile();
      if (profile) {
        // Ensure role_id is a number if it exists
        const roleId = profile.role_id ? Number(profile.role_id) : null;
        
        this.profileForm.patchValue({
          Name: profile.Name,
          Surname: profile.Surname,
          Email: profile.Email,
          Height: profile.Height,
          DateOfBirth: profile.DateOfBirth,
          Sex: profile.Sex,
          Activity: profile.Activity,
          role_id: roleId,
          ColorScheme: profile.ColorScheme || 'default',
          FontFamily: profile.FontFamily || 'system',
          FontSize: profile.FontSize ?? 12
        });
        this.hasExistingProfile = true;
        this.updateCurrentRole(roleId);
        this.themeService.applyProfilePreferences(profile);
      }
    } catch (error) {
      console.error('Error loading profile', error);
      this.snackBar.open('Failed to load profile', 'Close', { duration: 3000 });
    }
  }

  private async onAppearanceChanged() {
    const formValue = this.profileForm.value;

    // Apply immediately to the running app
    this.themeService.applyProfilePreferences(formValue as Partial<Profile>);

    // Only auto-save if a profile already exists in the DB
    if (!this.hasExistingProfile) {
      return;
    }

    // Debounce saves to avoid spamming the API while the user is interacting
    if (this.appearanceSaveTimeout) {
      clearTimeout(this.appearanceSaveTimeout);
    }

    this.appearanceSaveTimeout = setTimeout(async () => {
      try {
        const profileData: any = { ...this.profileForm.value };

        if (profileData.DateOfBirth instanceof Date) {
          const d = profileData.DateOfBirth;
          profileData.DateOfBirth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        await this.dietService.saveProfile(profileData as Profile);
      } catch (error) {
        console.error('Auto-saving appearance failed', error);
      }
    }, 400);
  }

  updateCurrentRole(roleId: number | null | undefined) {
    if (!roleId) {
      this.currentRole.set(null);
      return;
    }
    const role = this.userTypes().find(t => t.ID === roleId);
    this.currentRole.set(role ? role.Type : null);
  }

  async saveProfile() {
    if (this.profileForm.valid) {
      try {
        const formValue = this.profileForm.value;
        // Ensure DateOfBirth is formatted correctly if needed, but MatDatepicker usually handles Date objects.
        // The backend expects DATEONLY, so sending YYYY-MM-DD string or Date object that Sequelize can parse is fine.
        // Angular Material Datepicker returns a Date object.
        
        const profileData: any = { ...formValue };
        
        // Simple date formatting to YYYY-MM-DD to avoid timezone issues if sending Date object directly
        if (profileData.DateOfBirth instanceof Date) {
            const d = profileData.DateOfBirth;
            profileData.DateOfBirth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        const saved = await this.dietService.saveProfile(profileData as Profile);
        this.themeService.applyProfilePreferences(saved);
        this.snackBar.open('Profile saved successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/analytics']);
      } catch (error) {
        console.error('Error saving profile', error);
        this.snackBar.open('Failed to save profile', 'Close', { duration: 3000 });
      }
    }
  }
}
