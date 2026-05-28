import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<ThemeMode>(this.getStoredTheme());
  currentTheme$ = this.themeSubject.asObservable();

  private readonly THEME_KEY = 'app_theme';

  constructor() {}

  /**
   * Initialise le thème au démarrage de l'application
   */
  initTheme(): void {
    const theme = this.getStoredTheme();
    this.applyTheme(theme);
  }

  /**
   * Change le thème et le sauvegarde
   */
  setTheme(theme: ThemeMode): void {
    localStorage.setItem(this.THEME_KEY, theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  /**
   * Récupère le thème actuellement stocké
   */
  getStoredTheme(): ThemeMode {
    return (localStorage.getItem(this.THEME_KEY) as ThemeMode) || 'system';
  }

  /**
   * Applique physiquement la classe au body et l'attribut au html
   */
  private applyTheme(theme: ThemeMode): void {
    let themeToApply = theme;

    if (theme === 'system' || theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      themeToApply = prefersDark ? 'dark' : 'light';
    }

    const body = document.body;
    const html = document.documentElement;
    
    console.log(`[ThemeService] Application du mode : ${themeToApply} (Source: ${theme})`);

    // Nettoyer et appliquer sur le body (classe)
    if (themeToApply === 'dark') {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      html.setAttribute('data-theme', 'dark');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      html.setAttribute('data-theme', 'light');
    }
  }
}
