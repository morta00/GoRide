import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DriverConversationService } from '../../services/driver-conversation.service';
import { Conversation, ChatMessage, ConversationType } from '../../models/driver.models';
import { Subscription } from 'rxjs';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-driver-conversations',
  templateUrl: './driver-conversations.component.html',
  styleUrls: ['./driver-conversations.component.css']
})
export class DriverConversationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  
  searchTerm: string = '';
  activeFilter: string = 'ALL';
  newMessageContent: string = '';
  
  private sub: Subscription = new Subscription();
  private searchSub?: Subscription;

  constructor(
    private conversationService: DriverConversationService,
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.sub.add(
      this.conversationService.conversations$.subscribe(convs => {
        this.conversations = convs;
        this.applyFilters();
        
        if (this.selectedConversation) {
          this.selectedConversation = convs.find(c => c.id === this.selectedConversation!.id) || null;
        }
      })
    );

    // Handle URL parameters (ex. après acceptation : ?clientId=…&rideId=…)
    this.route.queryParams.subscribe(params => {
      const clientId = params['clientId'] ? Number(params['clientId']) : null;
      const rideId = params['rideId'] ? Number(params['rideId']) : (params['requestId'] ? Number(params['requestId']) : null);

      if (clientId && rideId) {
        const existing = this.conversationService.selectConversationByRideRequestId(rideId);
        if (existing) {
          this.selectConversation(existing);
          return;
        }
        this.conversationService.startRideConversation(clientId, rideId).subscribe({
          next: (conv) => {
            setTimeout(() => {
              const target =
                this.conversations.find(c => c.id === conv.id) ||
                this.conversationService.selectConversationByRideRequestId(rideId);
              if (target) this.selectConversation(target);
            }, 500);
          },
          error: (err) => console.error('Could not open ride conversation', err)
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.sub.unsubscribe();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  applyFilters(): void {
    let result = [...this.conversations];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        c.participantName.toLowerCase().includes(term) || 
        c.lastMessage.toLowerCase().includes(term) ||
        c.participantRole.toLowerCase().includes(term) ||
        (c.relatedTitle && c.relatedTitle.toLowerCase().includes(term)) ||
        c.type.toLowerCase().includes(term)
      );
    }

    if (this.activeFilter !== 'ALL') {
      if (this.activeFilter === 'UNREAD') {
        result = result.filter(c => c.unreadCount > 0);
      } else {
        result = result.filter(c => c.type === this.activeFilter);
      }
    }

    this.filteredConversations = result;

    // Auto-select first if none selected and filtered has items
    if (!this.selectedConversation && this.filteredConversations.length > 0) {
      // We don't auto-select on every filter change to avoid jumping, 
      // but maybe it's better for UX if requested.
    }
  }

  selectConversation(conv: Conversation): void {
    this.selectedConversation = conv;
    this.conversationService.markAsRead(conv.id);
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedConversation) return;
    
    this.conversationService.sendMessage(this.selectedConversation.id, this.newMessageContent.trim());
    this.newMessageContent = '';
  }

  handleAction(conv: Conversation): void {
    switch (conv.type) {
      case 'PASSENGER':
        if (conv.relatedEntityId && (conv.relatedEntityType === 'REQUEST' || conv.relatedEntityType === 'TRIP')) {
          this.router.navigate(['/driver/trips'], {
            queryParams: { requestId: conv.relatedEntityId, openDetails: '1' }
          });
        } else {
          this.router.navigate(['/driver/trips']);
        }
        break;
      case 'OWNER':
        this.router.navigate(['/driver/my-vehicle']);
        break;
      case 'COMPANY':
        this.router.navigate(['/driver/company-offers']);
        break;
      case 'SUPPORT':
        alert('Ticket support actif. Un agent vous répondra sous peu.');
        break;
    }
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  getTypeLabel(type: string): string {
    const labels: any = {
      'PASSENGER': 'Passager',
      'OWNER': 'Propriétaire',
      'SUPPORT': 'Support',
      'COMPANY': 'Entreprise'
    };
    return labels[type] || type;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
