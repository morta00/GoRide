import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Conversation {
  id: number;
  ownerId: number;
  clientId: number;
  otherParticipantName: string;
  otherParticipantPhoto: string;
  vehicleName: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private apiUrl = `${environment.apiUrl}/messages/conversations`;

  constructor(private http: HttpClient) {}

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.apiUrl);
  }

  createConversation(otherId: number, vehicleId?: number): Observable<Conversation> {
    return this.http.post<Conversation>(this.apiUrl, { otherId, vehicleId });
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${conversationId}/read`, {});
  }
}
