import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MessageService } from '../../../services/message.service';
import { AuthService } from '../../../auth/auth.service';
import { RoleService } from '../../../auth/role.service';
import { MessagingService } from '../../../services/messaging.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface ChatMessage {
  id?: number;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  sentByMe: boolean;
}

interface Conversation {
  id: string;
  type: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  avatar: string;
  rideId?: string;
  route?: string;
  tripRoute?: string;
  tripRef?: string;
  vehicleName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  messages: ChatMessage[];
  bookingId?: string;
}

@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.css']
})
export class ConversationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatBody') private chatBodyContainer!: ElementRef;

  isTenantMode = false;
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  
  searchTerm: string = '';
  activeFilter: string = 'ALL';
  newMessage: string = '';
  
  // Modals
  showCallModal = false;
  showInfoModal = false;
  showForgotModal = false;
  forgottenObjectDescription = '';
  private currentUserId: number | null = null;
  private searchSub?: Subscription;

  constructor(
    private messageService: MessageService, 
    public authService: AuthService,
    private roleService: RoleService,
    private messagingService: MessagingService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private searchService: SearchService
  ) { }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.syncCurrentUserId();
    this.loadMyUserIdFromApi();
    this.authService.user$.subscribe(() => {
      this.syncCurrentUserId();
      this.loadMyUserIdFromApi();
    });
    this.messagingService.initWebSocket();
    this.messagingService.message$.subscribe(msg => {
      if (!msg || !this.selectedConversation || (msg as any).type === 'READ_EVENT') return;
      const convId = Number((msg as any).conversationId);
      if (convId !== Number(this.selectedConversation.id)) return;
      const chatMsg: ChatMessage = {
        senderId: String((msg as any).senderId),
        senderName: (msg as any).senderName || 'Utilisateur',
        content: (msg as any).content || '',
        timestamp: (msg as any).timestamp || new Date().toISOString(),
        isRead: false,
        sentByMe: (msg as any).mine === true || this.isSentByMe({ senderId: String((msg as any).senderId) } as ChatMessage)
      };
      if (!this.selectedConversation.messages.some(m => this.messageKey(m) === this.messageKey(chatMsg))) {
        this.selectedConversation.messages.push(chatMsg);
      }
    });

    this.route.queryParams.subscribe(params => {
      const context = params['context'];
      if (context === 'RENTAL') {
        this.roleService.setActiveRole('ROLE_CLIENT', false);
      } else if (context === 'RIDE') {
        this.roleService.setActiveRole('ROLE_USER', false);
      }

      const driverId = params['driverId'] ? Number(params['driverId']) : null;
      const rideId = params['rideId'] ? Number(params['rideId']) : null;
      if (driverId) {
        this.openChatWithDriver(driverId, rideId);
      }
    });

    this.roleService.activeRole$.subscribe(role => {
      this.isTenantMode = role === 'ROLE_CLIENT';
      this.selectedConversation = null;
      this.loadConversations();
    });
  }

  private openChatWithDriver(driverId: number, rideId: number | null): void {
    this.messagingService.startConversation({
      participantId: driverId,
      context: 'RIDE_REQUEST',
      rideId: rideId ?? undefined,
      bookingId: rideId ?? undefined
    }).subscribe({
      next: (conv) => {
        this.loadConversations();
        if (conv?.id) {
          setTimeout(() => {
            const found = this.conversations.find(c => c.id === String(conv.id));
            if (found) this.selectConversation(found);
          }, 500);
        }
      },
      error: (err) => console.error('Could not start conversation with driver', err)
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  loadConversations(): void {
    this.route.queryParams.subscribe(params => {
      const queryConvId = params['conversationId'] ? String(params['conversationId']) : null;
      const contextParam = this.isTenantMode ? 'RENTAL' : 'RIDE';

      this.messagingService.getConversations(contextParam).subscribe({
        next: (data) => {
          const mapped = (data || []).map((c: any) => {
            const isRide = c.context === 'RIDE_REQUEST' || c.context === 'RIDE';
            const isDriver = c.participantRole === 'ROLE_DRIVER' || c.participantRoleLabel === 'Chauffeur';
            const type = isRide || isDriver ? 'DRIVER' : ((c.vehicleId && c.vehicleName !== 'Général') ? 'DRIVER' : 'SUPPORT');
            const tripRoute = c.tripRoute as string | undefined;
            const routeLabel = tripRoute
              || (c.vehicleName && c.vehicleName !== 'Général' ? c.vehicleName : undefined);
            return {
              id: String(c.id),
              type: type,
              participantId: String(c.participantId),
              participantName: c.participantName || (this.isTenantMode ? 'Propriétaire GoRide' : 'Chauffeur GoRide'),
              participantRole: c.participantRoleLabel || c.participantRole || (this.isTenantMode ? 'Propriétaire' : 'Chauffeur'),
              avatar: c.otherParticipantPhoto || '',
              rideId: c.vehicleId ? String(c.vehicleId) : undefined,
              route: routeLabel,
              tripRoute,
              tripRef: isRide && c.bookingId ? `#${c.bookingId}` : undefined,
              vehicleName: c.vehicleName && c.vehicleName !== 'Général' ? c.vehicleName : undefined,
              lastMessage: c.lastMessage || 'Aucun message',
              lastMessageAt: c.updatedAt || new Date().toISOString(),
              unreadCount: c.unreadCount || 0,
              status: 'ACTIVE',
              messages: [],
              bookingId: c.bookingId ? String(c.bookingId) : undefined
            };
          });

          this.conversations = mapped;
          this.applyFilters();
          
          if (queryConvId) {
            const found = this.conversations.find(c => c.id === queryConvId);
            if (found) {
              this.selectConversation(found);
            } else if (this.conversations.length > 0) {
              this.selectConversation(this.conversations[0]);
            }
          } else if (this.conversations.length > 0 && !this.selectedConversation) {
            this.selectConversation(this.conversations[0]);
          }
        },
        error: (err) => console.error("Error loading conversations", err)
      });
    });
  }

  applyFilters(): void {
    let result = [...this.conversations];

    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        c.participantName.toLowerCase().includes(q) ||
        (c.route || '').toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.vehicleName || '').toLowerCase().includes(q)
      );
    }

    if (this.activeFilter === 'DRIVER') {
      result = result.filter(c => c.type === 'DRIVER');
    } else if (this.activeFilter === 'SUPPORT') {
      result = result.filter(c => c.type === 'SUPPORT');
    } else if (this.activeFilter === 'UNREAD') {
      result = result.filter(c => c.unreadCount > 0);
    }

    result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    
    this.filteredConversations = result;
  }

  selectConversation(conv: Conversation): void {
    this.selectedConversation = conv;
    conv.unreadCount = 0;
    this.messagingService.markAsRead(Number(conv.id)).subscribe();
    this.messagingService.getMessages(Number(conv.id)).subscribe({
      next: (messages) => {
        conv.messages = (messages || []).map((m: any) => this.mapApiMessage(m));
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => console.error("Error loading messages", err)
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation) return;

    const convId = Number(this.selectedConversation.id);
    const content = this.newMessage;

    this.messagingService.sendMessage(convId, content).subscribe({
      next: (msg) => {
        const chatMsg: ChatMessage = {
          id: msg.id != null ? Number(msg.id) : undefined,
          senderId: String(msg.senderId),
          senderName: msg.senderName || 'Moi',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          isRead: true,
          sentByMe: true
        };
        this.selectedConversation!.messages.push(chatMsg);
        this.selectedConversation!.lastMessage = chatMsg.content;
        this.selectedConversation!.lastMessageAt = chatMsg.timestamp;
        this.newMessage = '';
        this.applyFilters();
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => alert(err?.error?.message || "Erreur lors de l'envoi du message.")
    });
  }

  reportForgottenObject(): void {
    if (!this.forgottenObjectDescription.trim() || !this.selectedConversation) return;

    const content = `Bonjour, j'ai oublié un objet dans votre véhicule : ${this.forgottenObjectDescription}`;
    this.newMessage = content;
    this.sendMessage();
    
    this.showForgotModal = false;
    this.forgottenObjectDescription = '';
  }

  private scrollToBottom(): void {
    try {
      if (this.chatBodyContainer) {
        this.chatBodyContainer.nativeElement.scrollTop = this.chatBodyContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  private loadMyUserIdFromApi(): void {
    this.http.get<{ id?: number }>(`${environment.apiUrl}/users/me`).subscribe({
      next: (me) => {
        if (me?.id != null && !Number.isNaN(Number(me.id))) {
          this.currentUserId = Number(me.id);
        }
      }
    });
  }

  private syncCurrentUserId(): void {
    const user = this.authService.getCurrentUser();
    const rawId = user?.id ?? (user as { userId?: number })?.userId;
    if (rawId != null && !Number.isNaN(Number(rawId))) {
      this.currentUserId = Number(rawId);
    }
  }

  private mapApiMessage(m: any): ChatMessage {
    const mapped: ChatMessage = {
      id: m.id != null ? Number(m.id) : undefined,
      senderId: String(m.senderId ?? m.sender?.id ?? ''),
      senderName: m.senderName || 'Utilisateur',
      content: m.content || '',
      timestamp: m.timestamp || new Date().toISOString(),
      isRead: m.isRead || false,
      sentByMe: false
    };
    mapped.sentByMe = m.mine === true || this.isSentByMe(mapped);
    return mapped;
  }

  isSentByMe(msg: ChatMessage): boolean {
    if (msg.sentByMe === true) {
      return true;
    }
    const sender = Number(msg.senderId);
    return this.currentUserId != null && !Number.isNaN(sender) && sender === this.currentUserId;
  }

  private messageKey(msg: ChatMessage): string {
    return msg.id != null ? `id:${msg.id}` : `${msg.senderId}|${msg.timestamp}|${msg.content}`;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
