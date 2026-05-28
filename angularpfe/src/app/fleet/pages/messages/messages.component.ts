import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MessagingService, Conversation, Message } from '../../../services/messaging.service';
import { AuthService } from '../../../auth/auth.service';
import { SearchService } from '../../../services/search.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatBody') private chatBodyContainer!: ElementRef;

  conversations: Conversation[] = [];
  selectedConversation?: Conversation;
  messages: Message[] = [];
  newMessage: string = '';
  currentUser: any;
  searchTerm: string = '';
  selectedFilter: string = 'ALL'; // ALL, RENTAL_CLIENT, DRIVER_RENTAL, SUPPORT, UNREAD
  loadingConversations: boolean = true;
  loadingMessages: boolean = false;
  isSending: boolean = false;
  isOtherTyping: boolean = false;
  errorMessage: string | null = null;
  isUsingMockData: boolean = false;
  showTripModal = false;
  tripModalLoading = false;
  tripModalError: string | null = null;
  tripDetail: {
    id: number;
    route: string;
    departure?: string;
    destination?: string;
    status?: string;
    clientName?: string;
    driverName?: string;
    price?: number;
    passengers?: number;
  } | null = null;

  private conversationsSub?: Subscription;
  private messageSub?: Subscription;
  private stompSub?: any;
  private typingSub?: any;
  private typingTimer?: any;
  private searchSub?: Subscription;

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private searchService: SearchService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
      }
    });
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.errorMessage = "Vous devez être connecté pour accéder à la messagerie.";
      return;
    }
    this.loadConversations();
    this.messagingService.initWebSocket();

    this.messageSub = this.messagingService.message$.subscribe(msg => {
      if (msg) {
        this.handleGlobalMessage(msg);
      }
    });

    this.route.queryParams.subscribe(params => {
      const convId = params['convId'];
      if (convId) {
        this.waitForConversationsAndSelect(Number(convId));
      }
    });
  }

  onTyping(): void {
    if (this.selectedConversation && this.selectedConversation.id > 0) {
      this.messagingService.sendTypingStatus(this.selectedConversation.id, true);
    }
  }

  private waitForConversationsAndSelect(id: number): void {
    if (this.loadingConversations) {
      setTimeout(() => this.waitForConversationsAndSelect(id), 200);
      return;
    }
    const conv = this.conversations.find(c => c.id === id);
    if (conv) {
      this.selectConversation(conv);
      return;
    }
    this.selectConversation({
      id,
      ownerId: 0,
      clientId: 0,
      otherParticipantName: 'Client',
      otherParticipantPhoto: '',
      vehicleName: '',
      lastMessage: '',
      lastMessageTimestamp: new Date().toISOString(),
      unreadCount: 0,
      context: 'RENTAL'
    });
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    if (this.conversationsSub) {
      this.conversationsSub.unsubscribe();
    }
    if (this.messageSub) {
      this.messageSub.unsubscribe();
    }
    if (this.stompSub) {
      this.stompSub.unsubscribe();
    }
    if (this.typingSub) {
      this.typingSub.unsubscribe();
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.messagingService.disconnect();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private normalizeConversation(c: Conversation): Conversation {
    const rawCtx = ((c as any).context || 'RENTAL').toString().toUpperCase();
    let context = (c as any).context || 'RENTAL_CLIENT';
    if (rawCtx === 'RENTAL' || rawCtx === 'RENTAL_CLIENT') {
      context = 'RENTAL_CLIENT';
    } else if (rawCtx.includes('RENTAL')) {
      context = rawCtx;
    } else if (rawCtx === 'RIDE' || rawCtx === 'RIDE_REQUEST') {
      context = 'DRIVER_RENTAL';
    }

    const bookingId =
      (c as any).bookingId != null ? Number((c as any).bookingId) : undefined;
    const tripRoute = (c as any).tripRoute as string | undefined;

    return {
      ...c,
      id: Number(c.id),
      context,
      otherParticipantName:
        c.otherParticipantName || c.participantName || 'Utilisateur',
      otherParticipantPhoto:
        c.otherParticipantPhoto || (c as any).participantPhoto || '',
      participantId: (c as any).participantId != null ? Number((c as any).participantId) : c.participantId,
      lastMessageTimestamp:
        c.lastMessageTimestamp || (c as any).updatedAt || new Date().toISOString(),
      vehicleName: c.vehicleName || tripRoute || 'Général',
      bookingId,
      tripRoute,
      unreadCount: c.unreadCount ?? 0
    };
  }

  isRideConversation(conv?: Conversation): boolean {
    if (!conv?.bookingId) return false;
    if (conv.tripRoute?.includes('→')) return true;
    return /course\s*#/i.test(conv.vehicleName || '');
  }

  isRentalConversation(conv?: Conversation): boolean {
    return conv?.context === 'RENTAL_CLIENT' && !!conv.bookingId;
  }

  viewTripDetails(): void {
    const conv = this.selectedConversation;
    if (!conv?.bookingId) return;

    this.showTripModal = true;
    this.tripModalError = null;
    this.tripModalLoading = true;
    this.tripDetail = {
      id: conv.bookingId,
      route: conv.tripRoute || conv.vehicleName || `Course #${conv.bookingId}`,
      clientName: conv.otherParticipantName
    };

    this.http
      .get<any>(`${environment.apiUrl}/rides/requests/${conv.bookingId}`)
      .subscribe({
        next: (ride) => {
          const dep = ride?.departure || '';
          const dest = ride?.destination || '';
          const route =
            dep && dest ? `${dep} → ${dest}` : conv.tripRoute || conv.vehicleName || '';
          this.tripDetail = {
            id: conv.bookingId!,
            route,
            departure: dep,
            destination: dest,
            status: ride?.status,
            clientName: ride?.clientName || conv.otherParticipantName,
            driverName: ride?.driverName,
            price: ride?.estimatedPrice,
            passengers: ride?.passengers
          };
          this.tripModalLoading = false;
        },
        error: () => {
          this.tripModalLoading = false;
          if (!this.tripDetail?.route || this.tripDetail.route === 'Général') {
            this.tripModalError =
              'Impossible de charger le détail de la course. Réessayez plus tard.';
          }
        }
      });
  }

  viewRentalDetails(): void {
    const conv = this.selectedConversation;
    if (!conv?.bookingId) return;
    this.router.navigate(['/fleet/bookings'], {
      queryParams: { search: String(conv.bookingId) }
    });
  }

  closeTripModal(): void {
    this.showTripModal = false;
    this.tripModalLoading = false;
    this.tripModalError = null;
    this.tripDetail = null;
  }

  loadConversations(): void {
    this.loadingConversations = true;
    this.errorMessage = null;
    this.messagingService.getConversations().subscribe({
      next: (data) => {
        this.conversations = (data || []).map((c: Conversation) => this.normalizeConversation(c));
        this.isUsingMockData = false;
        this.loadingConversations = false;
        this.messagingService.requestCountsRefresh();
      },
      error: (err) => {
        console.error('[Messages] Erreur API:', err);
        this.conversations = [];
        this.isUsingMockData = false;
        this.loadingConversations = false;
        this.errorMessage = "Erreur de chargement des conversations depuis le serveur.";
      }
    });
  }

  selectConversation(conv: Conversation): void {
    this.selectedConversation = conv;
    this.errorMessage = null;
    this.messages = []; // Clear current messages
    
    // Gérer les abonnements WebSocket
    if (this.stompSub) {
      this.stompSub.unsubscribe();
    }
    if (this.typingSub) {
      this.typingSub.unsubscribe();
    }

    this.stompSub = this.messagingService.subscribeToConversation(conv.id, (msg: any) => {
      this.handleReceivedMessage(msg);
    });

    this.typingSub = this.messagingService.subscribeToTopic(`/topic/conversations/${conv.id}/typing`, (data: any) => {
      if (data.userId !== this.currentUser.id) {
        this.isOtherTyping = data.isTyping;
        
        if (this.typingTimer) clearTimeout(this.typingTimer);
        if (data.isTyping) {
          this.typingTimer = setTimeout(() => {
            this.isOtherTyping = false;
          }, 3000);
        }
      }
    });
    
    this.loadMessages(conv.id);
    if (conv.unreadCount > 0) {
      this.markAsRead(conv);
    }
  }

  private normalizeMessage(msg: any): Message {
    const senderId = Number(msg.senderId ?? msg.sender?.id);
    const myId = Number(this.currentUser?.id);
    return {
      ...msg,
      id: msg.id != null ? Number(msg.id) : undefined,
      conversationId: Number(msg.conversationId),
      senderId,
      sentByMe: msg.mine === true || (!Number.isNaN(myId) && senderId === myId)
    } as Message & { sentByMe?: boolean };
  }

  private messageFingerprint(msg: Message): string {
    if (msg.id != null && !Number.isNaN(msg.id)) {
      return `id:${msg.id}`;
    }
    return `${msg.senderId}|${msg.timestamp}|${msg.content}`;
  }

  private handleReceivedMessage(msg: Message): void {
    const normalized = this.normalizeMessage(msg);
    if (
      this.selectedConversation &&
      Number(normalized.conversationId) !== Number(this.selectedConversation.id)
    ) {
      return;
    }
    const fp = this.messageFingerprint(normalized);
    const exists = this.messages.some(m => this.messageFingerprint(m) === fp);
    if (!exists) {
      this.messages.push(normalized);
      this.scrollToBottom(true);

      if (this.selectedConversation) {
        this.selectedConversation.lastMessage = normalized.content;
        this.selectedConversation.lastMessageTimestamp = normalized.timestamp;
      }
    }
  }

  private handleGlobalMessage(msg: any): void {
    if (msg.type === 'READ_EVENT') {
      if (this.selectedConversation && this.selectedConversation.id === msg.conversationId) {
        this.messages.forEach(m => m.isRead = true);
      }
      return;
    }
    const convId = Number(msg.conversationId);
    const conv = this.conversations.find(c => Number(c.id) === convId);
    if (conv) {
      conv.lastMessage = msg.content;
      conv.lastMessageTimestamp = msg.timestamp;
      if (!this.selectedConversation || Number(this.selectedConversation.id) !== convId) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
      this.sortConversationsList();
    } else {
      this.loadConversations();
    }
    this.messagingService.requestCountsRefresh();
  }

  private sortConversationsList(): void {
    this.conversations.sort((a, b) => {
      const dateA = new Date(a.lastMessageTimestamp).getTime();
      const dateB = new Date(b.lastMessageTimestamp).getTime();
      return dateB - dateA;
    });
  }

  isNewDay(messages: Message[], index: number): boolean {
    if (index === 0) return true;
    const current = new Date(messages[index].timestamp).toDateString();
    const previous = new Date(messages[index - 1].timestamp).toDateString();
    return current !== previous;
  }

  formatDateSeparator(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  loadMessages(conversationId: number): void {
    this.loadingMessages = true;
    this.messagingService.getMessages(conversationId).subscribe({
      next: (data) => {
        this.messages = (data || []).map((m: any) => this.normalizeMessage(m));
        this.loadingMessages = false;
        this.scrollToBottom(true);
      },
      error: (err) => {
        console.error('Erreur chargement messages', err);
        this.loadingMessages = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation || this.isSending) return;

    const content = this.newMessage.trim();
    this.newMessage = '';

    this.isSending = true;
    this.messagingService.sendMessage(this.selectedConversation.id, content).subscribe({
      next: (msg: Message) => {
        this.handleReceivedMessage(msg);
        this.isSending = false;
        this.sortConversationsList();
      },
      error: (err: any) => {
        this.isSending = false;
        console.error('Erreur envoi message', err);
        alert('Échec de l\'envoi.');
      }
    });
  }

  markAsRead(conv: Conversation): void {
    this.messagingService.markAsRead(conv.id).subscribe({
      next: () => conv.unreadCount = 0,
      error: (err) => console.error('Erreur markAsRead', err)
    });
  }

  setFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  private matchesContextFilter(c: Conversation, filter: string): boolean {
    const ctx = ((c as any).context || '').toString().toUpperCase();
    const f = filter.toUpperCase();
    if (f === 'RENTAL_CLIENT') {
      return ctx === 'RENTAL_CLIENT' || ctx === 'RENTAL';
    }
    if (f === 'DRIVER_RENTAL') {
      return ctx === 'DRIVER_RENTAL' || ctx === 'RIDE' || ctx === 'RIDE_REQUEST';
    }
    if (f === 'SUPPORT') {
      return ctx === 'SUPPORT';
    }
    return ctx === f;
  }

  filteredConversations(): Conversation[] {
    let filtered = [...this.conversations];

    // Filter by context/type
    if (this.selectedFilter !== 'ALL') {
      if (this.selectedFilter === 'UNREAD') {
        filtered = filtered.filter(c => c.unreadCount > 0);
      } else {
        filtered = filtered.filter(c => this.matchesContextFilter(c, this.selectedFilter));
      }
    }

    // Filter by search term
    const term = this.searchTerm?.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(c => 
        c.otherParticipantName.toLowerCase().includes(term) ||
        (c.vehicleName && c.vehicleName.toLowerCase().includes(term))
      );
    }

    return filtered;
  }

  private scrollToBottom(force: boolean = false): void {
    try {
      if (this.chatBodyContainer) {
        this.chatBodyContainer.nativeElement.scrollTop = this.chatBodyContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const currentMsgDate = new Date(this.messages[index].timestamp).toDateString();
    const prevMsgDate = new Date(this.messages[index - 1].timestamp).toDateString();
    return currentMsgDate !== prevMsgDate;
  }

  getDateLabel(timestamp: string): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Aujourd\'hui';
    if (date.toDateString() === yesterday.toDateString()) return 'Hier';
    return date.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
