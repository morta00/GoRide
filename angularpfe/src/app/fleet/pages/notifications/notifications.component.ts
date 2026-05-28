import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface FleetNotification {
  id: number;
  type: 'new_booking' | 'booking_accepted' | 'booking_rejected' | 'payment_received' | 'maintenance' | 'message';
  label: string;
  description: string;
  time: string;
  isRead: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: FleetNotification[] = [];
  activeFilter: string = 'ALL';
  activeToasts: FleetNotification[] = [];
  isLoading = false;

  // Pagination State
  currentPage: number = 1;
  itemsPerPage: number = 5;

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:8081/api/fleet/notifications').subscribe({
      next: (data) => {
        this.notifications = (data || []).map(n => this.formatNotification(n));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        this.notifications = [];
        this.isLoading = false;
      }
    });
  }

  formatNotification(n: any): FleetNotification {
    let type: FleetNotification['type'] = 'new_booking';
    const titleLower = n.title?.toLowerCase() || '';
    if (titleLower.includes('accept') || titleLower.includes('confirm')) {
      type = 'booking_accepted';
    } else if (titleLower.includes('refus') || titleLower.includes('annul')) {
      type = 'booking_rejected';
    } else if (titleLower.includes('paye') || titleLower.includes('argent') || titleLower.includes('revenu') || titleLower.includes('transaction')) {
      type = 'payment_received';
    } else if (titleLower.includes('panne') || titleLower.includes('maintenance') || titleLower.includes('technique') || titleLower.includes('révision')) {
      type = 'maintenance';
    } else if (titleLower.includes('messag') || titleLower.includes('discut')) {
      type = 'message';
    } else {
      const t = n.type?.toUpperCase() || 'INFO';
      if (t === 'SUCCESS') type = 'booking_accepted';
      else if (t === 'DANGER') type = 'booking_rejected';
      else if (t === 'WARNING') type = 'maintenance';
    }

    return {
      id: n.id,
      type: type,
      label: n.title,
      description: n.message,
      time: this.formatRelativeTime(n.createdAt),
      isRead: !!n.isRead
    };
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dateStr;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalFilteredItems / this.itemsPerPage);
  }

  get totalFilteredItems(): number {
    return this.applyFilter(this.notifications).length;
  }

  get paginatedNotifications(): FleetNotification[] {
    const filtered = this.applyFilter(this.notifications);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showingStart(): number {
    return this.totalFilteredItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get showingEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalFilteredItems);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  private applyFilter(notifs: FleetNotification[]): FleetNotification[] {
    if (this.activeFilter === 'ALL') return notifs;
    if (this.activeFilter === 'UNREAD') return notifs.filter(n => !n.isRead);
    if (this.activeFilter === 'BOOKINGS') return notifs.filter(n => n.type.includes('booking'));
    if (this.activeFilter === 'PAYMENTS') return notifs.filter(n => n.type === 'payment_received');
    if (this.activeFilter === 'MESSAGES') return notifs.filter(n => n.type === 'message');
    if (this.activeFilter === 'MAINTENANCE') return notifs.filter(n => n.type === 'maintenance');
    return notifs;
  }

  showToast(notif: FleetNotification): void {
    this.activeToasts.push(notif);
    setTimeout(() => {
      this.removeToast(notif.id);
    }, 5000);
  }

  removeToast(id: number): void {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
  }

  getFilterCount(filter: string): number {
    switch (filter) {
      case 'ALL': return this.notifications.length;
      case 'UNREAD': return this.notifications.filter(n => !n.isRead).length;
      case 'BOOKINGS': return this.notifications.filter(n => n.type.includes('booking')).length;
      case 'PAYMENTS': return this.notifications.filter(n => n.type === 'payment_received').length;
      case 'MESSAGES': return this.notifications.filter(n => n.type === 'message').length;
      case 'MAINTENANCE': return this.notifications.filter(n => n.type === 'maintenance').length;
      default: return 0;
    }
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'new_booking': return 'ion-md-add-circle';
      case 'booking_accepted': return 'ion-md-checkmark-circle';
      case 'booking_rejected': return 'ion-md-close-circle';
      case 'payment_received': return 'ion-md-cash';
      case 'maintenance': return 'ion-md-build';
      case 'message': return 'ion-md-text';
      default: return 'ion-md-notifications';
    }
  }

  getTypeText(type: string): string {
    switch (type) {
      case 'new_booking': return 'Réservation';
      case 'booking_accepted': return 'Confirmé';
      case 'booking_rejected': return 'Refusé';
      case 'payment_received': return 'Finance';
      case 'maintenance': return 'Technique';
      case 'message': return 'Message';
      default: return 'Info';
    }
  }

  getBadgeClass(type: string): string {
    switch (type) {
      case 'new_booking': return 'bg-primary-soft text-primary';
      case 'booking_accepted': return 'bg-success-soft text-success';
      case 'booking_rejected': return 'bg-danger-soft text-danger';
      case 'payment_received': return 'bg-warning-soft text-warning';
      case 'maintenance': return 'bg-orange-soft text-orange';
      case 'message': return 'bg-purple-soft text-purple';
      default: return 'bg-light text-muted';
    }
  }

  navigateToRelatedPage(notif: FleetNotification): void {
    this.markAsRead(notif);
    
    switch (notif.type) {
      case 'new_booking':
      case 'booking_accepted':
      case 'booking_rejected':
        this.router.navigate(['/fleet/bookings']);
        break;
      case 'payment_received':
        this.router.navigate(['/fleet/earnings']);
        break;
      case 'maintenance':
        this.router.navigate(['/fleet/vehicles']);
        break;
      case 'message':
        this.router.navigate(['/fleet/dashboard']);
        break;
      default:
        break;
    }
  }

  markAsRead(notif: FleetNotification): void {
    if (notif.isRead) return;
    this.http.put(`http://localhost:8081/api/notifications/${notif.id}/read`, {}).subscribe({
      next: () => {
        notif.isRead = true;
      },
      error: (err) => console.error('Error marking notification as read:', err)
    });
  }

  toggleRead(notif: FleetNotification, event: Event): void {
    event.stopPropagation();
    this.http.put(`http://localhost:8081/api/notifications/${notif.id}/read`, {}).subscribe({
      next: () => {
        notif.isRead = !notif.isRead;
      },
      error: (err) => console.error('Error toggling notification status:', err)
    });
  }

  markAllAsRead(): void {
    this.http.put('http://localhost:8081/api/notifications/read-all', {}).subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      },
      error: (err) => console.error('Error marking all notifications as read:', err)
    });
  }

  hasUnread(): boolean {
    return this.notifications.some(n => !n.isRead);
  }

  deleteNotif(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer cette notification ?')) {
      this.http.delete(`http://localhost:8081/api/notifications/${id}`).subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n.id !== id);
        },
        error: (err) => console.error('Error deleting notification:', err)
      });
    }
  }

  refresh(): void {
    this.loadNotifications();
  }
}
