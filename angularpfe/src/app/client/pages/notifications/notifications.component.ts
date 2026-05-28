import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { RoleService } from '../../../auth/role.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

export interface Notification {
  id: string;
  type: 'RIDE_REQUEST' | 'DRIVER_ACCEPTED' | 'DRIVER_ARRIVING' | 'RIDE_STARTED' | 'RIDE_COMPLETED' | 'RIDE_CANCELLED' | 'SHARED_RIDE_BOOKED' | 'MESSAGE' | 'PAYMENT' | 'REFUND' | 'REVIEW' | 'SUPPORT';
  title: string;
  message: string;
  isRead: boolean;
  isImportant: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  targetUrl?: string;
  createdAt: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  isTenantMode = false;
  
  // Search & Filters
  searchTerm: string = '';
  activeFilter: string = 'ALL';
  sortOrder: string = 'RECENT';

  // Modal
  selectedNotification: Notification | null = null;
  showModal = false;

  userName: string = '';
  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
    private roleService: RoleService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    const user = this.authService.getCurrentUser();
    this.userName = user ? `${user.firstName} ${user.lastName}` : '';
    
    this.roleService.activeRole$.subscribe(role => {
      this.isTenantMode = role === 'ROLE_CLIENT';
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadData(): void {
    this.notificationService.loadAll();
    this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = (notifs || []).map(n => ({
        id: String(n.id),
        type: this.mapType(n.type),
        title: n.label || '',
        message: n.description || '',
        isRead: n.isRead || false,
        isImportant: n.color === 'red' || n.color === 'orange',
        relatedEntityId: n.targetUrl ? n.targetUrl.split('/').pop() : undefined,
        relatedEntityType: n.targetUrl ? 'LINK' : undefined,
        targetUrl: n.targetUrl,
        createdAt: n.time || new Date().toISOString()
      }));
      this.applyFilters();
    });
    this.notificationService.loadAll();
  }

  private mapType(type: string): any {
    const t = (type || '').toUpperCase();
    if (t.includes('RIDE') || t.includes('COURSE')) return 'RIDE_COMPLETED';
    if (t.includes('MESSAGE')) return 'MESSAGE';
    if (t.includes('PAYMENT')) return 'PAYMENT';
    if (t.includes('SUPPORT')) return 'SUPPORT';
    return 'RIDE_REQUEST';
  }

  applyFilters(): void {
    let result = [...this.notifications];

    // Search
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      );
    }

    // Filter
    if (this.activeFilter === 'UNREAD') result = result.filter(n => !n.isRead);
    else if (this.activeFilter === 'IMPORTANT') result = result.filter(n => n.isImportant);
    else if (this.activeFilter === 'RIDE') result = result.filter(n => n.type.includes('RIDE') || n.type.includes('DRIVER'));
    else if (this.activeFilter === 'MESSAGE') result = result.filter(n => n.type === 'MESSAGE');
    else if (this.activeFilter === 'PAYMENT') result = result.filter(n => n.type === 'PAYMENT' || n.type === 'REFUND');
    else if (this.activeFilter === 'SUPPORT') result = result.filter(n => n.type === 'SUPPORT');

    // Sort
    result.sort((a, b) => {
      if (this.sortOrder === 'RECENT') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (this.sortOrder === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (this.sortOrder === 'UNREAD_FIRST') return (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0);
      if (this.sortOrder === 'IMPORTANT_FIRST') return (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0);
      return 0;
    });

    this.filteredNotifications = result;
  }

  viewNotification(notif: Notification): void {
    this.selectedNotification = notif;
    this.showModal = true;
    if (!notif.isRead) {
      this.markAsRead(notif.id);
    }
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(Number(id));
  }

  toggleRead(notif: Notification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(Number(notif.id));
    }
  }

  deleteNotification(id: string): void {
    if (confirm('Voulez-vous supprimer cette notification ?')) {
      this.notificationService.deleteNotification(Number(id));
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteRead(): void {
    if (confirm('Voulez-vous supprimer toutes les notifications lues ?')) {
      this.notifications.forEach(n => {
        if (n.isRead) {
          this.notificationService.deleteNotification(Number(n.id));
        }
      });
    }
  }

  goToLinkedEntity(): void {
    if (!this.selectedNotification) return;
    this.showModal = false;
    const target = this.selectedNotification.targetUrl?.trim();
    if (target) {
      const path = target.startsWith('/') ? target : `/${target}`;
      this.router.navigateByUrl(path);
      return;
    }
    this.router.navigate(['/client/reservations']);
  }

  // Stats Helpers
  getStats() {
    const now = new Date().toDateString();
    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.isRead).length,
      important: this.notifications.filter(n => n.isImportant).length,
      today: this.notifications.filter(n => new Date(n.createdAt).toDateString() === now).length
    };
  }

  getIcon(type: string): string {
    if (type.includes('RIDE') || type.includes('DRIVER')) return 'ion-md-car';
    if (type === 'MESSAGE') return 'ion-md-chatbubbles';
    if (type === 'PAYMENT' || type === 'REFUND') return 'ion-md-wallet';
    if (type === 'SUPPORT') return 'ion-md-headset';
    if (type === 'REVIEW') return 'ion-md-star';
    return 'ion-md-notifications';
  }
}
