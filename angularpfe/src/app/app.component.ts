import { Component } from '@angular/core';
import { LanguageService } from './i18n/language.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'angularpfe';
  currentUrl = window.location.href;
  showAssistant = true;

  constructor(
    private readonly _language: LanguageService,
    private router: Router,
    private themeService: ThemeService
  ) {
    const initialPath = this.router.url || '';
    this.showAssistant = !initialPath.startsWith('/login') && !initialPath.startsWith('/signup');

    // Initialiser le thème (clair/sombre)
    this.themeService.initTheme();
    
    // Nettoyage du localStorage métier (une seule fois au démarrage)
    this.cleanupBusinessStorage();
    
    // Mettre à jour l'URL affichée à chaque changement de navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = window.location.origin + event.url;
      const path = event.urlAfterRedirects || event.url || '';
      this.showAssistant = !path.startsWith('/login') && !path.startsWith('/signup');
    });
  }

  private cleanupBusinessStorage(): void {
    const keysToKeep = ['token', 'user', 'theme', 'language', 'selectedLanguage', 'auth_token'];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.some(k => key.includes(k))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log("LocalStorage métier nettoyé. Clés conservées :", keysToKeep);
  }
}
