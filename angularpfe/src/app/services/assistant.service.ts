import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssistantChatResponse {
  reply: string;
  provider: string;
  aiEnabled: boolean;
}

export interface AssistantStatus {
  provider: string;
  geminiConfigured: boolean;
  geminiKeyPresent?: boolean;
  geminiModel?: string;
  mode: string;
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private baseUrl = `${environment.apiUrl}/assistant`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<AssistantStatus> {
    return this.http.get<AssistantStatus>(`${this.baseUrl}/status`);
  }

  chat(
    message: string,
    locale = 'fr',
    history: AssistantChatMessage[] = []
  ): Observable<AssistantChatResponse> {
    return this.http.post<AssistantChatResponse>(`${this.baseUrl}/chat`, { message, locale, history });
  }
}
