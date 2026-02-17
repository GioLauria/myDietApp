import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-user-manual',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './user-manual.html',
  styleUrl: './user-manual.scss'
})
export class UserManual {}
