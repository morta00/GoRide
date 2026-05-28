import { Component } from '@angular/core';
import { LanguageOption, LanguageService } from '../i18n/language.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {

  constructor(private readonly languageService: LanguageService) {}

  /** Label for the language you can switch to (not the active one). */
  get currentLanguageLabelFull(): string {
    return this.languageService.current === 'en' ? 'Français' : 'English';
  }

  toggleLanguage(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const next: LanguageOption['code'] = this.languageService.current === 'en' ? 'fr' : 'en';
    this.languageService.use(next);
  }
}
