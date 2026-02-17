import { Injectable } from '@angular/core';
import type { Profile } from './diet';

export type ColorScheme = 'default' | 'cool' | 'warm' | 'dark';

interface ColorConfig {
  primary: string;
  accent: string;
  surfaceSoft: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  applyProfilePreferences(profile?: Partial<Profile> | null): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;

    const scheme = (profile as any)?.ColorScheme as ColorScheme | undefined || 'default';
    const colors = this.getColorConfig(scheme);

    root.style.setProperty('--app-primary', colors.primary);
    root.style.setProperty('--app-accent', colors.accent);
    root.style.setProperty('--app-surface-soft', colors.surfaceSoft);

    const fontKey = ((profile as any)?.FontFamily as string | undefined) || 'system';
    const fontFamily = this.getFontFamily(fontKey);
    if (fontFamily) {
      body.style.fontFamily = fontFamily;
    }

    const sizeValue = (profile as any)?.FontSize;
    const baseSize = typeof sizeValue === 'number' ? sizeValue : Number(sizeValue);
    const defaultSize = 12;
    const size = !isNaN(baseSize) && baseSize > 0 ? baseSize : defaultSize;
    const clamped = Math.max(10, Math.min(20, size));
    root.style.fontSize = `${clamped}px`;
  }

  private getColorConfig(scheme: ColorScheme): ColorConfig {
    switch (scheme) {
      case 'cool':
        return {
          primary: '#00838f',
          accent: '#4dd0e1',
          surfaceSoft: '#e0f7fa',
        };
      case 'warm':
        return {
          primary: '#ef6c00',
          accent: '#ffca28',
          surfaceSoft: '#fff3e0',
        };
      case 'dark':
        return {
          primary: '#90caf9',
          accent: '#f48fb1',
          surfaceSoft: '#121212',
        };
      case 'default':
      default:
        return {
          primary: '#1976d2',
          accent: '#ffb74d',
          surfaceSoft: '#f4f7ff',
        };
    }
  }

  private getFontFamily(key: string): string {
    const map: Record<string, string> = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: '"Georgia", "Times New Roman", serif',
      mono: '"Fira Code", "Consolas", "Courier New", monospace',
    };

    return map[key] || map['system'];
  }
}
