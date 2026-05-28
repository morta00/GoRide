import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LanguageOption {
  code: 'fr' | 'en';
  label: 'FR' | 'EN';
}

const STORAGE_KEY = 'app_lang';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  readonly supported: LanguageOption[] = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' }
  ];

  constructor(private readonly translate: TranslateService) {
    this.translate.addLangs(this.supported.map(l => l.code));
    this.translate.setDefaultLang('fr');
    this.translate.setFallbackLang('fr');

    const saved = localStorage.getItem(STORAGE_KEY) as LanguageOption['code'] | null;
    const browser = this.translate.getBrowserLang() as LanguageOption['code'] | undefined;
    const initial: LanguageOption['code'] =
      saved === 'fr' || saved === 'en' ? saved : browser === 'en' ? 'en' : 'fr';
    this.use(initial, false);
  }

  /** Emits whenever the active UI language changes. */
  get languageChanged$(): Observable<LanguageOption['code']> {
    return this.translate.onLangChange.pipe(map(e => e.lang as LanguageOption['code']));
  }

  get current(): LanguageOption['code'] {
    return (this.translate.currentLang as LanguageOption['code']) || 'fr';
  }

  use(code: LanguageOption['code'], persist = true): void {
    if (!this.supported.some(l => l.code === code)) {
      code = 'fr';
    }

    if (persist) {
      localStorage.setItem(STORAGE_KEY, code);
    }
    document.documentElement.lang = code;

    this.translate.reloadLang(code).subscribe({
      next: () => {
        this.translate.use(code).subscribe();
      },
      error: () => {
        this.translate.use(code).subscribe();
      }
    });
  }
}



