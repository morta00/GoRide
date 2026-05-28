import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AssistantChatMessage, AssistantService } from '../../services/assistant.service';
import { LanguageService } from '../../i18n/language.service';

interface ChatLine {
  from: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-assistant-widget',
  templateUrl: './assistant-widget.component.html',
  styleUrls: ['./assistant-widget.component.css']
})
export class AssistantWidgetComponent implements OnInit, OnDestroy {
  open = false;
  loading = false;
  input = '';
  messages: ChatLine[] = [];
  suggestionKeys = ['ASSISTANT.SUGGEST_1', 'ASSISTANT.SUGGEST_2', 'ASSISTANT.SUGGEST_3', 'ASSISTANT.SUGGEST_4'];
  welcomeOnly = true;
  private langSub?: Subscription;

  constructor(
    private assistant: AssistantService,
    private language: LanguageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.applyWelcomeMessage();

    this.langSub = this.translate.onLangChange.subscribe(() => {
      if (this.welcomeOnly) {
        this.applyWelcomeMessage();
      }
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  /** Langue active de l'app (FR/EN), alignée sur LanguageService / navigateur / choix utilisateur. */
  private currentLocale(): string {
    return this.language.current;
  }

  private applyWelcomeMessage(): void {
    this.translate.get('ASSISTANT.WELCOME').subscribe(welcome => {
      if (this.messages.length === 0) {
        this.messages.push({ from: 'bot', text: welcome });
        this.welcomeOnly = true;
      } else if (this.welcomeOnly && this.messages[0]?.from === 'bot') {
        this.messages[0].text = welcome;
      }
    });
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open && this.welcomeOnly && this.messages.length === 0) {
      this.applyWelcomeMessage();
    }
  }

  askSuggestion(key: string): void {
    if (this.loading) return;
    this.translate.get(key).subscribe(text => {
      if (!text) return;
      this.input = text;
      this.send();
    });
  }

  send(): void {
    const text = this.input.trim();
    if (!text || this.loading) return;
    this.welcomeOnly = false;
    this.messages.push({ from: 'user', text });
    this.input = '';
    this.loading = true;
    const prior = this.messages.slice(0, -1);
    const history: AssistantChatMessage[] = prior
      .filter((m, i) => !(i === 0 && m.from === 'bot'))
      .slice(-20)
      .map(m => ({
        role: m.from === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      }));

    this.assistant.chat(text, this.currentLocale(), history).subscribe({
      next: res => {
        this.messages.push({ from: 'bot', text: res.reply });
        this.loading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        let key = 'ASSISTANT.ERROR.BACKEND_UNREACHABLE';
        if (err.status === 401 || err.status === 403) {
          key = 'ASSISTANT.ERROR.ACCESS_DENIED';
        } else if (err.status === 0) {
          key = 'ASSISTANT.ERROR.CONNECTION_FAILED';
        } else if (err.status >= 500) {
          key = 'ASSISTANT.ERROR.SERVER_ERROR';
        }
        this.translate.get(key).subscribe(msg => {
          this.messages.push({ from: 'bot', text: msg });
        });
        this.loading = false;
        this.scrollToBottom();
      }
    });
  }

  formatMessage(text: string): string {
    if (!text) return '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = document.querySelector('.assistant-messages');
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
