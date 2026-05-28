import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Conversation } from '../models/driver.models';
import { MessagingService } from '../../services/messaging.service';

@Injectable({
  providedIn: 'root'
})
export class DriverConversationService {
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  conversations$ = this.conversationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private messagingService: MessagingService
  ) {
    this.refreshConversations();
  }

  refreshConversations(): void {
    this.http.get<any[]>(`${environment.apiUrl}/driver/conversations`).subscribe({
      next: (res) => {
        if (res) {
          this.conversationsSubject.next(res);
        }
      },
      error: (err) => {
        console.error('Error fetching conversations', err);
      }
    });
  }

  getConversations(): Observable<Conversation[]> {
    return this.conversations$;
  }

  getConversationById(id: string): Observable<Conversation | undefined> {
    return this.conversations$.pipe(
      map(list => list.find(c => c.id === id))
    );
  }

  sendMessage(conversationId: string, content: string): void {
    this.http.post<any>(`${environment.apiUrl}/conversations/${conversationId}/messages`, {
      content: content
    }).subscribe({
      next: () => {
        this.refreshConversations();
      },
      error: (err) => {
        console.error('Error sending message', err);
      }
    });
  }

  markAsRead(conversationId: string): void {
    this.http.put<any>(`${environment.apiUrl}/conversations/${conversationId}/read`, {}).subscribe({
      next: () => {
        this.refreshConversations();
        this.messagingService.requestCountsRefresh();
      },
      error: (err) => {
        console.error('Error marking message as read', err);
      }
    });
  }

  /** Ouvre ou crée la conversation course passager ↔ chauffeur */
  startRideConversation(passengerId: number, rideRequestId: number): Observable<{ id: string }> {
    return this.http.post<any>(`${environment.apiUrl}/conversations/start`, {
      participantId: passengerId,
      context: 'RIDE_REQUEST',
      rideId: rideRequestId,
      bookingId: rideRequestId
    }).pipe(
      map(conv => ({ id: String(conv.id) })),
      tap(() => this.refreshConversations())
    );
  }

  selectConversationByRideRequestId(rideRequestId: number): Conversation | undefined {
    const id = String(rideRequestId);
    return this.conversationsSubject.value.find(
      c => c.relatedEntityId === id && (c.relatedEntityType === 'REQUEST' || c.type === 'PASSENGER')
    );
  }
}
