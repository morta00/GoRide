import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

/**
 * Interface représentant un message.
 */
export interface Message {
  id?: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  /** Set by API when loading history for the current viewer */
  mine?: boolean;
}

/**
 * Interface représentant une conversation.
 */
export interface Conversation {
  id: number;
  ownerId: number;
  clientId: number;
  otherParticipantName: string;
  otherParticipantPhoto: string;
  vehicleId?: number;
  vehicleName: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  context?: string;
  participantId?: number;
  participantName?: string;
  participantRoleLabel?: string;
  bookingId?: number;
  /** Départ → destination pour les courses (RIDE / RIDE_REQUEST) */
  tripRoute?: string;
}

/**
 * Service gérant les appels API et les WebSockets pour la messagerie.
 */
import { environment } from 'src/environments/environment';

// ... (interfaces)

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = `${environment.apiUrl}/messages`;
  private wsUrl = `${environment.apiUrl.replace('/api', '')}/ws`;
  private stompClient: Client | null = null;
  
  private messageSubject = new BehaviorSubject<Message | null>(null);
  public message$ = this.messageSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private countsRefreshSubject = new BehaviorSubject<void>(undefined);
  public countsRefresh$ = this.countsRefreshSubject.asObservable();

  requestCountsRefresh(): void {
    this.countsRefreshSubject.next();
  }

  constructor(private http: HttpClient) {}

  // --- WebSocket Logic ---

  initWebSocket(): void {
    if (this.stompClient && this.stompClient.active) {
      return; // Déjà connecté ou en cours
    }

    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.wsUrl),
      debug: (msg: string) => {
        // console.log(msg);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Connected to WebSocket');
      this.updateUnreadCount();

      if (user && user.id) {
        this.stompClient!.subscribe(`/user/${user.id}/queue/messages`, (message: IMessage) => {
          if (message.body) {
            const msg = JSON.parse(message.body);
            this.messageSubject.next(msg);
            this.updateUnreadCount();
          }
        });

        this.stompClient!.subscribe(`/user/${user.id}/queue/notifications`, (message: IMessage) => {
          if (message.body) {
            const data = JSON.parse(message.body);
            if (data.status === 'READ') {
              this.messageSubject.next({ ...data, type: 'READ_EVENT' } as any);
            }
          }
        });
      }
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.activate();
  }

  subscribeToConversation(conversationId: number, callback: (msg: Message) => void): any {
    return this.subscribeToTopic(`/topic/conversations/${conversationId}`, callback);
  }

  subscribeToTopic(topic: string, callback: (data: any) => void): any {
    if (this.stompClient && this.stompClient.connected) {
      return this.stompClient.subscribe(topic, (message: IMessage) => {
        if (message.body) {
          callback(JSON.parse(message.body));
        }
      });
    }
    return null;
  }

  sendTypingStatus(conversationId: number, isTyping: boolean): void {
    if (this.stompClient && this.stompClient.connected) {
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
      this.stompClient.publish({
        destination: `/app/conversations/${conversationId}/typing`,
        body: JSON.stringify({
          userId: user.id,
          isTyping: isTyping
        })
      });
    }
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }

  // --- API Logic ---

  updateUnreadCount(context?: string): void {
    this.getConversations(context).subscribe({
      next: (convs) => {
        const total = convs.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
        this.unreadCountSubject.next(total);
      },
      error: (err) => console.error('Error updating unread count', err)
    });
  }

  getConversations(context?: string): Observable<Conversation[]> {
    let url = `${environment.apiUrl}/conversations/me`;
    if (context) {
      url += `?context=${context}`;
    }
    return this.http.get<Conversation[]>(url);
  }

  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId: number, content: string): Observable<Message> {
    return this.http.post<Message>(`${environment.apiUrl}/conversations/${conversationId}/messages`, { content });
  }

  /** @deprecated Préférer startConversation — évite les réponses JSON trop volumineuses. */
  createConversation(otherId: number, vehicleId?: number): Observable<Conversation> {
    return this.startConversation({
      participantId: otherId,
      context: 'RENTAL',
      vehicleId
    });
  }

  startConversation(params: {
    participantId: number;
    context: string;
    vehicleId?: number;
    bookingId?: number;
    rideId?: number;
  }): Observable<Conversation> {
    return this.http.post<Conversation>(`${environment.apiUrl}/conversations/start`, params);
  }

  toApiError(err: unknown): { message: string } {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string') {
        try {
          const p = JSON.parse(body);
          return { message: p.message || body };
        } catch {
          return { message: body };
        }
      }
      return { message: body?.message || err.message || 'Erreur serveur' };
    }
    if (err && typeof err === 'object' && 'message' in err) {
      return { message: String((err as { message: string }).message) };
    }
    return { message: 'Une erreur est survenue.' };
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/conversations/${conversationId}/read`, {}).pipe(
      tap(() => {
        this.updateUnreadCount('RENTAL');
        this.requestCountsRefresh();
      })
    );
  }
}
