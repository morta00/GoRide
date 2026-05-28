import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class CompanyNotificationsComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  filteredNotifications: any[] = [];
  
  searchTerm = '';
  typeFilter = 'ALL';
  sortBy = 'NEWEST';

  stats = {
    total: 0,
    unread: 0,
    important: 0,
    today: 0
  };

  selectedNotification: any = null;
  showModal = false;
  showDeleteConfirm = false;
  notificationToDelete: any = null;

  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private searchService: SearchService
  ) {}

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
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.companyService.getNotifications().subscribe({
      next: (notifs) => {
        const list = notifs || [];
        if (list.length === 0) {
          this.applyDemoNotifications();
        } else {
          this.notifications = list.map((n: any) => this.normalizeNotification(n));
        }
        this.calculateStats();
        this.applyFilters();
      },
      error: () => {
        this.applyDemoNotifications();
        this.calculateStats();
        this.applyFilters();
      }
    });
  }

  private normalizeNotification(n: any): any {
    const type = n.type || 'SERVICE_REQUEST';
    const isRead = !!n.isRead;
    return {
      id: n.id,
      type,
      title: n.title || this.mapTypeToTitle(type),
      message: this.cleanNotificationMessage(n.message || n.text || 'Notification GoRide'),
      isRead,
      isImportant: n.isImportant ?? this.isImportantType(type, isRead),
      relatedEntityType: n.relatedEntityType || 'REQUEST',
      relatedEntityId: n.relatedEntityId || n.id,
      createdAt: n.createdAt || new Date().toISOString()
    };
  }

  private cleanNotificationMessage(msg: string): string {
    return msg.replace(/\[GORIDE-CORP-DEMO\]\s*/g, '').trim();
  }

  private isImportantType(type: string, isRead: boolean): boolean {
    if (isRead) {
      return false;
    }
    return ['INVOICE', 'OWNER_REJECTED', 'SERVICE_REQUEST', 'MESSAGE', 'DRIVER_ACCEPTED', 'OWNER_ACCEPTED'].includes(type);
  }

  private applyDemoNotifications(): void {
    const now = Date.now();
    const hour = 3600000;
    this.notifications = [
      { id: 'demo-n1', type: 'OWNER_ACCEPTED', title: 'Propriétaire accepté — flotte Sfax', message: 'Ahmed Abidi a validé 3 véhicules pour votre mission à Sfax.', isRead: false, isImportant: true, relatedEntityType: 'REQUEST', relatedEntityId: 1, createdAt: new Date(now - 2 * hour).toISOString() },
      { id: 'demo-n2', type: 'DRIVER_ACCEPTED', title: 'Chauffeur assigné — Imed Kilani', message: 'Demande #42 : chauffeur confirmé pour la semaine prochaine.', isRead: false, isImportant: true, relatedEntityType: 'REQUEST', relatedEntityId: 42, createdAt: new Date(now - 5 * hour).toISOString() },
      { id: 'demo-n3', type: 'INVOICE', title: 'Facture en attente — 750 DT', message: 'FAC-2026-204 : acompte flotte été à régler avant le 05/06.', isRead: false, isImportant: true, relatedEntityType: 'INVOICE', relatedEntityId: 204, createdAt: new Date(now - 24 * hour).toISOString() },
      { id: 'demo-n4', type: 'MESSAGE', title: 'Nouveau message — Ahmed Abidi', message: '« Les véhicules seront disponibles dès 8h demain. »', isRead: false, isImportant: true, relatedEntityType: 'CONVERSATION', relatedEntityId: 1, createdAt: new Date(now - 3 * hour).toISOString() },
      { id: 'demo-n5', type: 'PAYMENT', title: 'Paiement confirmé — 1 250 DT', message: 'Virement reçu pour la location utilitaire Sfax (3 véhicules).', isRead: true, isImportant: false, relatedEntityType: 'INVOICE', relatedEntityId: 5, createdAt: new Date(now - 3 * 24 * hour).toISOString() },
      { id: 'demo-n6', type: 'SERVICE_COMPLETED', title: 'Service terminé — mission Tunis', message: 'Location Peugeot 508 clôturée. Vous pouvez laisser un avis.', isRead: true, isImportant: false, relatedEntityType: 'REVIEW', relatedEntityId: 6, createdAt: new Date(now - 5 * 24 * hour).toISOString() },
      { id: 'demo-n7', type: 'OWNER_REJECTED', title: 'Demande refusée — véhicule indisponible', message: 'Renault Kangoo non disponible aux dates demandées.', isRead: true, isImportant: false, relatedEntityType: 'REQUEST', relatedEntityId: 7, createdAt: new Date(now - 2 * 24 * hour).toISOString() },
      { id: 'demo-n8', type: 'REVIEW', title: 'Rappel avis — chauffeur Imed', message: 'Notez votre expérience pour la mission Sfax.', isRead: false, isImportant: false, relatedEntityType: 'REVIEW', relatedEntityId: 8, createdAt: new Date(now - 4 * 24 * hour).toISOString() }
    ];
  }

  private mapTypeToTitle(type: string): string {
    const titles: any = {
      SERVICE_REQUEST: 'Demande envoyée',
      OWNER_ACCEPTED: 'Propriétaire accepté',
      OWNER_REJECTED: 'Propriétaire refusé',
      DRIVER_ACCEPTED: 'Chauffeur accepté',
      DRIVER_REJECTED: 'Chauffeur refusé',
      SERVICE_COMPLETED: 'Service terminé',
      INVOICE: 'Nouvelle facture',
      PAYMENT: 'Paiement confirmé',
      MESSAGE: 'Nouveau message',
      REVIEW: 'Avis à laisser'
    };
    return titles[type] || 'Alerte GoRide';
  }

  calculateStats(): void {
    const now = new Date();
    this.stats = {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.isRead).length,
      important: this.notifications.filter(n => n.isImportant).length,
      today: this.notifications.filter(n => {
        const d = new Date(n.createdAt);
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      }).length
    };
  }

  applyFilters(): void {
    let items = [...this.notifications];

    const q = this.searchTerm.toLowerCase().trim();
    if (q) {
      items = items.filter(n => 
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        this.getTypeLabel(n.type).toLowerCase().includes(q)
      );
    }

    if (this.typeFilter !== 'ALL') {
      if (this.typeFilter === 'UNREAD') items = items.filter(n => !n.isRead);
      else if (this.typeFilter === 'IMPORTANT') items = items.filter(n => n.isImportant);
      else if (this.typeFilter === 'REQUESTS') {
        items = items.filter(n => 
          ['SERVICE_REQUEST', 'OWNER_ACCEPTED', 'OWNER_REJECTED', 'DRIVER_ACCEPTED', 'DRIVER_REJECTED', 'REQUEST_CANCELLED', 'SERVICE_CONFIRMED', 'SERVICE_COMPLETED']
          .includes(n.type)
        );
      }
      else if (this.typeFilter === 'MESSAGES') items = items.filter(n => n.type === 'MESSAGE');
      else if (this.typeFilter === 'INVOICES') items = items.filter(n => n.type === 'INVOICE');
      else if (this.typeFilter === 'PAYMENTS') items = items.filter(n => n.type === 'PAYMENT' || n.type === 'REFUND');
      else if (this.typeFilter === 'REVIEWS') items = items.filter(n => n.type === 'REVIEW');
      else if (this.typeFilter === 'SUPPORT') items = items.filter(n => n.type === 'SUPPORT');
    }

    items.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (this.sortBy === 'NEWEST') return timeB - timeA;
      if (this.sortBy === 'OLDEST') return timeA - timeB;
      if (this.sortBy === 'UNREAD_FIRST') return (a.isRead === b.isRead) ? timeB - timeA : (a.isRead ? 1 : -1);
      if (this.sortBy === 'IMPORTANT_FIRST') return (a.isImportant === b.isImportant) ? timeB - timeA : (a.isImportant ? -1 : 1);
      return 0;
    });

    this.filteredNotifications = items;
  }

  toggleRead(notif: any, event?: Event): void {
    if (event) event.stopPropagation();
    notif.isRead = !notif.isRead;
    this.calculateStats();
    this.applyFilters();
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.isRead = true);
    this.calculateStats();
    this.applyFilters();
  }

  deleteRead(): void {
    this.notifications = this.notifications.filter(n => !n.isRead);
    this.calculateStats();
    this.applyFilters();
  }

  confirmDelete(notif: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.notificationToDelete = notif;
    this.showDeleteConfirm = true;
  }

  deleteNotification(): void {
    if (this.notificationToDelete) {
      this.notifications = this.notifications.filter(n => n.id !== this.notificationToDelete.id);
      this.calculateStats();
      this.applyFilters();
      this.showDeleteConfirm = false;
      this.notificationToDelete = null;
    }
  }

  viewNotification(notif: any): void {
    this.selectedNotification = notif;
    this.showModal = true;
    if (!notif.isRead) {
      notif.isRead = true;
      this.calculateStats();
    }
  }

  closeModals(): void {
    this.showModal = false;
    this.showDeleteConfirm = false;
    this.selectedNotification = null;
    this.notificationToDelete = null;
  }

  getTypeLabel(type: string): string {
    const labels: any = {
      SERVICE_REQUEST: 'Demande',
      OWNER_ACCEPTED: 'Propriétaire accepté',
      OWNER_REJECTED: 'Propriétaire refusé',
      DRIVER_ACCEPTED: 'Chauffeur accepté',
      DRIVER_REJECTED: 'Chauffeur refusé',
      SERVICE_CONFIRMED: 'Service confirmé',
      SERVICE_COMPLETED: 'Service terminé',
      MESSAGE: 'Message',
      INVOICE: 'Facture',
      PAYMENT: 'Paiement',
      REFUND: 'Remboursement',
      REVIEW: 'Avis',
      SUPPORT: 'Support'
    };
    return labels[type] || 'Alerte';
  }

  getTypeIcon(type: string): string {
    const icons: any = {
      SERVICE_REQUEST: 'ion-md-send',
      OWNER_ACCEPTED: 'ion-md-checkmark-circle',
      OWNER_REJECTED: 'ion-md-close-circle',
      DRIVER_ACCEPTED: 'ion-md-person',
      DRIVER_REJECTED: 'ion-md-close-circle',
      SERVICE_CONFIRMED: 'ion-md-flash',
      SERVICE_COMPLETED: 'ion-md-flag',
      MESSAGE: 'ion-md-chatbubbles',
      INVOICE: 'ion-md-paper',
      PAYMENT: 'ion-md-wallet',
      REFUND: 'ion-md-refresh',
      REVIEW: 'ion-md-star',
      SUPPORT: 'ion-md-help-buoy'
    };
    return icons[type] || 'ion-md-notifications';
  }

  getTypeClass(type: string): string {
    if (type.includes('ACCEPTED') || type === 'PAYMENT' || type === 'SERVICE_CONFIRMED') return 'bg-soft-success text-success';
    if (type.includes('REJECTED') || type === 'REQUEST_CANCELLED') return 'bg-soft-danger text-danger';
    if (type === 'INVOICE' || type === 'MESSAGE') return 'bg-soft-primary text-primary';
    if (type === 'REVIEW') return 'bg-soft-warning text-warning';
    return 'bg-soft-secondary text-secondary';
  }

  navigateToEntity(): void {
    const n = this.selectedNotification;
    this.closeModals();
    if (n.relatedEntityType === 'REQUEST' || n.type.includes('REQUEST') || n.type.includes('ACCEPTED') || n.type.includes('REJECTED')) {
      this.router.navigate(['/company/requests']);
    } else if (n.relatedEntityType === 'CONVERSATION' || n.type === 'MESSAGE') {
      this.router.navigate(['/company/conversations'], { queryParams: { id: n.relatedEntityId } });
    } else if (n.relatedEntityType === 'INVOICE' || n.type === 'INVOICE') {
      this.router.navigate(['/company/payments']);
    } else if (n.relatedEntityType === 'PAYMENT' || n.type === 'PAYMENT' || n.type === 'REFUND') {
      this.router.navigate(['/company/payments']);
    } else if (n.relatedEntityType === 'REVIEW' || n.type === 'REVIEW') {
      this.router.navigate(['/company/reviews']);
    } else if (n.type === 'SUPPORT') {
      this.router.navigate(['/company/conversations'], { queryParams: { type: 'support' } });
    }
  }
}
