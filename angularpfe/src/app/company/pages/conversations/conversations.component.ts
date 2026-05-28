import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessagingService, Conversation, Message } from '../../../services/messaging.service';
import { AuthService } from '../../../auth/auth.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

interface CompanyConvView {
  id: number;
  type: string;
  participantId?: number;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  vehicleName?: string;
  serviceType?: string;
  missionName?: string;
  messages: ChatMsgView[];
}

interface ChatMsgView {
  text: string;
  time: string;
  sender: 'COMPANY' | 'OTHER';
}

@Component({
  selector: 'app-company-conversations',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.css']
})
export class CompanyConversationsComponent implements OnInit, OnDestroy {
  conversations: CompanyConvView[] = [];
  filteredConversations: CompanyConvView[] = [];
  selectedConversation: CompanyConvView | null = null;

  searchTerm = '';
  typeFilter = 'ALL';
  newMessage = '';
  loadingConversations = true;
  loadingMessages = false;
  isSending = false;
  errorMessage: string | null = null;

  showCallModal = false;
  showInfoModal = false;

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private searchSub?: Subscription;
  private messageSub?: Subscription;
  private stompSub: any = null;
  private pendingContactParams: Record<string, string> | null = null;
  private openingConversation = false;
  currentUser: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messagingService: MessagingService,
    private authService: AuthService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.messagingService.initWebSocket();
    this.messageSub = this.messagingService.message$.subscribe(msg => {
      if (msg) this.handleIncomingMessage(msg);
    });
    this.route.queryParams.subscribe(params => {
      this.pendingContactParams = params as Record<string, string>;
      this.tryOpenContactFromParams();
    });
    this.loadConversations();
    this.refreshInterval = setInterval(() => this.loadConversations(true), 12000);
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.messageSub?.unsubscribe();
    if (this.stompSub) this.stompSub.unsubscribe();
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.messagingService.disconnect();
  }

  loadConversations(silent = false): void {
    if (!silent) this.loadingConversations = true;
    this.messagingService.getConversations().subscribe({
      next: (data) => {
        const mapped = (data || []).map(c => this.mapConversation(c));
        this.conversations = mapped;
        if (this.selectedConversation) {
          const updated = mapped.find(c => c.id === this.selectedConversation!.id);
          if (updated) {
            this.selectedConversation = {
              ...updated,
              messages: this.selectedConversation.messages
            };
          }
        }
        this.applyFilters();
        this.loadingConversations = false;
        this.errorMessage = null;
        this.tryOpenContactFromParams();
      },
      error: (err) => {
        console.error('Erreur de chargement des conversations', err);
        this.loadingConversations = false;
        this.errorMessage = 'Impossible de charger les conversations.';
      }
    });
  }

  private mapConversation(c: Conversation): CompanyConvView {
    const role = (c as any).participantRole || '';
    const roleLabel = (c as any).participantRoleLabel || 'Partenaire';
    let type = 'SUPPORT';
    if (role.includes('FLEET') || roleLabel.toLowerCase().includes('propriétaire')) {
      type = 'OWNER';
    } else if (role.includes('DRIVER') || roleLabel.toLowerCase().includes('chauffeur')) {
      type = 'DRIVER';
    } else if (role.includes('ADMIN') || roleLabel.toLowerCase().includes('support')) {
      type = 'SUPPORT';
    }

    const ctx = ((c as any).context || '').toString().toUpperCase();
    if (ctx.includes('COMPANY_OWNER')) type = 'OWNER';
    if (ctx.includes('COMPANY_DRIVER')) type = 'DRIVER';

    const vehicleName = c.vehicleName && c.vehicleName !== 'Général' ? c.vehicleName : undefined;

    return {
      id: Number(c.id),
      type,
      participantId: (c as any).participantId != null ? Number((c as any).participantId) : undefined,
      participantName: c.otherParticipantName || (c as any).participantName || 'Partenaire',
      participantRole: roleLabel,
      lastMessage: c.lastMessage || '',
      lastMessageAt: c.lastMessageTimestamp || (c as any).updatedAt || new Date().toISOString(),
      unreadCount: c.unreadCount ?? 0,
      status: 'online',
      vehicleName,
      serviceType: type === 'OWNER' ? 'Location flotte' : type === 'DRIVER' ? 'Mission chauffeur' : undefined,
      missionName: (c as any).tripRoute || undefined,
      messages: []
    };
  }

  private tryOpenContactFromParams(): void {
    if (!this.pendingContactParams || this.loadingConversations || this.openingConversation) {
      return;
    }

    const params = this.pendingContactParams;
    const convId = params['convId'] || params['conversationId'];
    const ownerId = params['ownerId'];
    const driverId = params['driverId'];
    const type = params['type'];
    const context = params['context'] || (driverId ? 'COMPANY_DRIVER' : 'COMPANY_OWNER');

    if (convId) {
      const target = this.conversations.find(c => c.id === Number(convId));
      if (target) {
        this.selectConversation(target);
        this.pendingContactParams = null;
        return;
      }
    }

    if (ownerId) {
      const target = this.conversations.find(
        c => c.type === 'OWNER' && String(c.participantId) === String(ownerId)
      );
      if (target) {
        this.selectConversation(target);
        this.pendingContactParams = null;
        return;
      }
    }

    if (driverId) {
      const target = this.conversations.find(
        c => c.type === 'DRIVER' && String(c.participantId) === String(driverId)
      );
      if (target) {
        this.selectConversation(target);
        this.pendingContactParams = null;
        return;
      }
    }

    if (type === 'support') {
      const target = this.conversations.find(c => c.type === 'SUPPORT');
      if (target) {
        this.selectConversation(target);
        this.pendingContactParams = null;
        return;
      }
      this.errorMessage = 'Aucune conversation support. Choisissez un contact dans la liste.';
      return;
    }

    const participantId = driverId ? Number(driverId) : ownerId ? Number(ownerId) : NaN;
    if (!Number.isFinite(participantId) || participantId <= 0) {
      this.errorMessage = 'Impossible de contacter : partenaire non identifié sur cette demande.';
      return;
    }

    this.openingConversation = true;
    this.messagingService.startConversation({
      participantId,
      context,
      vehicleId: params['vehicleId'] ? Number(params['vehicleId']) : undefined,
      bookingId: params['bookingId'] ? Number(params['bookingId']) : undefined
    }).subscribe({
      next: (conv) => {
        this.openingConversation = false;
        this.pendingContactParams = null;
        this.loadConversations(true);
        setTimeout(() => {
          const byId = this.conversations.find(c => c.id === Number(conv.id));
          if (byId) {
            this.selectConversation(byId);
            this.errorMessage = null;
            return;
          }
          const byParticipant = this.conversations.find(
            c => String(c.participantId) === String(participantId)
          );
          if (byParticipant) {
            this.selectConversation(byParticipant);
            this.errorMessage = null;
          }
        }, 500);
      },
      error: (err) => {
        this.openingConversation = false;
        this.errorMessage = this.messagingService.toApiError(err).message
          || 'Impossible d\'ouvrir la conversation.';
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.conversations];

    if (this.typeFilter !== 'ALL') {
      if (this.typeFilter === 'UNREAD') {
        filtered = filtered.filter(c => c.unreadCount > 0);
      } else {
        filtered = filtered.filter(c => c.type === this.typeFilter);
      }
    }

    const q = this.searchTerm.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(c =>
        c.participantName.toLowerCase().includes(q) ||
        (c.vehicleName || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
      );
    }

    this.filteredConversations = filtered;
  }

  selectConversation(conv: CompanyConvView): void {
    this.selectedConversation = conv;
    conv.unreadCount = 0;
    this.loadingMessages = true;

    if (this.stompSub) this.stompSub.unsubscribe();
    this.stompSub = this.messagingService.subscribeToConversation(conv.id, (msg: Message) => {
      this.appendMessage(msg);
    });

    this.messagingService.getMessages(conv.id).subscribe({
      next: (msgs) => {
        conv.messages = (msgs || []).map(m => this.mapMessage(m));
        this.loadingMessages = false;
        this.messagingService.markAsRead(conv.id).subscribe();
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  private mapMessage(m: Message): ChatMsgView {
    const myId = Number(this.currentUser?.id);
    const mine = m.mine === true || Number(m.senderId) === myId;
    return {
      text: m.content,
      time: this.formatTime(m.timestamp),
      sender: mine ? 'COMPANY' : 'OTHER'
    };
  }

  private formatTime(ts: string): string {
    try {
      return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private appendMessage(msg: Message): void {
    if (!this.selectedConversation || Number(msg.conversationId) !== this.selectedConversation.id) {
      return;
    }
    const view = this.mapMessage(msg);
    const exists = this.selectedConversation.messages.some(
      m => m.text === view.text && m.time === view.time && m.sender === view.sender
    );
    if (!exists) {
      this.selectedConversation.messages.push(view);
      this.selectedConversation.lastMessage = view.text;
    }
  }

  private handleIncomingMessage(msg: Message): void {
    const convId = Number(msg.conversationId);
    const conv = this.conversations.find(c => c.id === convId);
    if (conv) {
      conv.lastMessage = msg.content;
      conv.lastMessageAt = msg.timestamp;
      if (!this.selectedConversation || this.selectedConversation.id !== convId) {
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
    } else {
      this.loadConversations(true);
    }
    if (this.selectedConversation?.id === convId) {
      this.appendMessage(msg);
    }
    this.applyFilters();
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.selectedConversation || this.isSending) return;

    this.isSending = true;
    this.newMessage = '';
    this.messagingService.sendMessage(this.selectedConversation.id, text).subscribe({
      next: (msg) => {
        this.appendMessage(msg);
        this.selectedConversation!.lastMessage = msg.content;
        this.isSending = false;
      },
      error: () => {
        this.isSending = false;
        this.newMessage = text;
        alert('Envoi impossible. Réessayez.');
      }
    });
  }

  getInitials(name?: string): string {
    if (!name?.trim()) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  openCall(): void { this.showCallModal = true; }
  openInfo(): void { this.showInfoModal = true; }
  closeModals(): void { this.showCallModal = false; this.showInfoModal = false; }

  getPhoneNumber(): string {
    if (this.selectedConversation?.type === 'OWNER') return '+216 71 000 111';
    if (this.selectedConversation?.type === 'DRIVER') return '+216 55 123 456';
    return '+216 70 000 000';
  }
}
