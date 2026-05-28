import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Message {
  id?: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${environment.apiUrl}/messages/conversations`;

  constructor(private http: HttpClient) {}

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${conversationId}/messages`);
  }

  sendMessage(conversationId: number, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/${conversationId}/send`, { content });
  }
}
