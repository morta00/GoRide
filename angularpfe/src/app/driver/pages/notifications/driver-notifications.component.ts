import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { DriverNotificationService } from '../../services/driver-notification.service';
import { NotificationService } from '../../../services/notification.service';
import { DriverNotification, NotificationSummary } from '../../models/driver.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-driver-notifications',
  templateUrl: './driver-notifications.component.html',
  styleUrls: ['./driver-notifications.component.css']
})
export class DriverNotificationsComponent implements OnInit, OnDestroy {
  notifications: DriverNotification[] = [];
  filteredNotifications: DriverNotification[] = [];
  summary: NotificationSummary = { total: 0, unread: 0, important: 0, today: 0 };
  
  searchTerm: string = '';
  activeFilter: string = 'ALL';
  typeFilter: string = 'ALL';
  sortOrder: string = 'recent';
  
  showModal: boolean = false;
  selectedNotification: DriverNotification | null = null;
  
  private sub: Subscription = new Subscription();
  private searchSub?: Subscription;

  constructor(
    private notificationService: DriverNotificationService,
    private sharedNotificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.notificationService.refreshNotifications();
    this.sharedNotificationService.loadAll();

    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.sub.add(
      this.notificationService.notifications$.subscribe(notifs => {
        this.notifications = notifs;
        this.applyFilters();
        this.updateSummary();
      })
    );
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.sub.unsubscribe();
  }

  updateSummary(): void {
    this.notificationService.getSummary().subscribe(s => this.summary = s);
  }

  applyFilters(): void {
    let result = [...this.notifications];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(term) || 
        n.message.toLowerCase().includes(term) ||
        n.type.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (this.activeFilter !== 'ALL') {
      if (this.activeFilter === 'UNREAD') result = result.filter(n => !n.read);
      else if (this.activeFilter === 'READ') result = result.filter(n => n.read);
      else if (this.activeFilter === 'IMPORTANT') result = result.filter(n => n.important);
      else if (this.activeFilter === 'TODAY') {
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(n => n.date.startsWith(today));
      }
    }

    // Type Filter
    if (this.typeFilter !== 'ALL') {
      result = result.filter(n => this.getGeneralType(n.type) === this.typeFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (this.sortOrder === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (this.sortOrder === 'older') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (this.sortOrder === 'important') return (b.important ? 1 : 0) - (a.important ? 1 : 0);
      if (this.sortOrder === 'unread') return (a.read ? 1 : 0) - (b.read ? 1 : 0);
      return 0;
    });

    this.filteredNotifications = result;
  }

  getGeneralType(type: string): string {
    if (type.includes('REQUEST')) return 'DEMANDES';
    if (type.includes('MESSAGE')) return 'MESSAGES';
    if (type.includes('PAYMENT')) return 'PAIEMENTS';
    if (type.includes('EARNING')) return 'REVENUS';
    if (type.includes('VEHICLE')) return 'VEHICULE';
    if (type.includes('REVIEW')) return 'AVIS';
    if (type.includes('COMPANY')) return 'ENTREPRISES';
    if (type.includes('DOCUMENT')) return 'DOCUMENTS';
    return 'SYSTEME';
  }

  openDetails(notif: DriverNotification): void {
    this.selectedNotification = notif;
    this.showModal = true;
    if (!notif.read) {
      this.notificationService.markAsRead(notif.id);
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedNotification = null;
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAsUnread(id: string): void {
    this.notificationService.markAsUnread(id);
  }

  deleteNotification(id: string): void {
    if (confirm('Supprimer cette notification ?')) {
      this.notificationService.deleteNotification(id);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteRead(): void {
    if (confirm('Supprimer toutes les notifications lues ?')) {
      this.notificationService.deleteReadNotifications();
    }
  }

  viewAction(notif: DriverNotification, event?: Event): void {
    event?.stopPropagation();
    if (!notif.read) {
      this.notificationService.markAsRead(notif.id);
    }

    const url = this.resolveActionUrl(notif);
    if (!url) {
      this.openDetails(notif);
      return;
    }

    this.closeModal();
    this.router.navigateByUrl(url).then(success => {
      if (!success) {
        this.openDetails(notif);
      }
    });
  }

  /** Build an in-app route from notification link + type (backend often sends INFO + /driver/requests). */
  private resolveActionUrl(notif: DriverNotification): string | null {
    let path = (notif.actionUrl || '').trim();

    if (path.startsWith('http')) {
      try {
        const u = new URL(path);
        path = u.pathname + u.search;
      } catch {
        path = '';
      }
    }

    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }

    const rideId = notif.relatedEntityId || this.extractIdFromUrl(path);
    const text = `${notif.title} ${notif.message}`.toLowerCase();
    const isSharedJoin =
      text.includes('covoiturage') ||
      text.includes('rejoindre') ||
      text.includes('réservation') ||
      text.includes('reservation') ||
      text.includes('place(s)');

    const isRide =
      notif.type === 'NEW_REQUEST' ||
      notif.type === 'REQUEST_ACCEPTED' ||
      text.includes('course') ||
      text.includes('trajet') ||
      text.includes('demande de course') ||
      isSharedJoin;

    if (isRide) {
      const bookingId = this.extractIdFromUrl(path) || (isSharedJoin ? rideId : null);
      if (bookingId && (isSharedJoin || path.includes('bookingId'))) {
        return `/driver/requests?bookingId=${bookingId}&openDetails=1`;
      }
      if (rideId && (notif.type === 'REQUEST_ACCEPTED' || text.includes('accepté'))) {
        return `/driver/trips?tripId=${rideId}&openDetails=1`;
      }
      if (rideId) {
        return `/driver/requests?requestId=${rideId}&openDetails=1`;
      }
      return '/driver/requests';
    }

    if (notif.type === 'NEW_MESSAGE' || text.includes('message')) {
      if (rideId) {
        return `/driver/conversations?rideId=${rideId}`;
      }
      return '/driver/conversations';
    }

    if (notif.type === 'PAYMENT_RECEIVED' || notif.type === 'EARNING_CREATED') {
      return '/driver/earnings';
    }

    if (notif.type === 'VEHICLE_RENTED') {
      return '/driver/my-vehicle';
    }

    if (notif.type === 'REVIEW_RECEIVED') {
      return '/driver/reviews';
    }

    if (notif.type === 'COMPANY_OFFER') {
      return '/driver/partner-vehicles';
    }

    if (path) {
      return path;
    }

    return null;
  }

  private extractIdFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:rideId|requestId|bookingId|id)=(\d+)/i);
    return match ? match[1] : null;
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'NEW_REQUEST': return 'ion-md-car';
      case 'REQUEST_ACCEPTED': return 'ion-md-checkmark-circle';
      case 'NEW_MESSAGE': return 'ion-md-text';
      case 'PAYMENT_RECEIVED': return 'ion-md-wallet';
      case 'EARNING_CREATED': return 'ion-md-cash';
      case 'VEHICLE_RENTED': return 'ion-md-key';
      case 'REVIEW_RECEIVED': return 'ion-md-star';
      case 'COMPANY_OFFER': return 'ion-md-business';
      case 'DOCUMENT_STATUS': return 'ion-md-document';
      default: return 'ion-md-notifications';
    }
  }
}
