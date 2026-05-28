import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  filteredNotifications: any[] = [];
  searchTerm: string = '';
  currentFilter: string = 'ALL';
  currentSort: string = 'NEWEST';

  stats = {
    total: 0,
    unread: 0,
    important: 0,
    today: 0,
    complaints: 0,
    reports: 0
  };

  selectedNotification: any = null;
  showDetailsModal: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/notifications`).subscribe({
      next: (data) => {
        this.notifications = (data || []).map(n => {
          const isRead = n.isRead === true || n.status === 'READ';
          return {
            id: 'NOT-' + n.id,
            title: n.title || 'Notification',
            message: n.message || '',
            type: n.type || 'SYSTEM',
            priority: n.priority || 'MEDIUM',
            status: isRead ? 'READ' : (n.status || 'NEW'),
            isRead,
            createdAt: n.createdAt || new Date().toISOString(),
            actionRoute: n.targetUrl || n.actionRoute || '/admin/notifications',
            relatedEntityId: n.id
          };
        });
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  calculateStats(): void {
    const today = new Date().toDateString();
    this.stats = {
      total: this.notifications.filter(n => n.status !== 'ARCHIVED').length,
      unread: this.notifications.filter(n => !n.isRead && n.status !== 'ARCHIVED').length,
      important: this.notifications.filter(n => n.priority === 'HIGH' && n.status !== 'ARCHIVED').length,
      today: this.notifications.filter(n => new Date(n.createdAt).toDateString() === today && n.status !== 'ARCHIVED').length,
      complaints: this.notifications.filter(n => n.type === 'COMPLAINT' && n.status !== 'ARCHIVED').length,
      reports: this.notifications.filter(n => n.type === 'REPORT' && n.status !== 'ARCHIVED').length
    };
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let result = this.notifications.filter(n => n.status !== 'ARCHIVED' || this.currentFilter === 'ARCHIVED');

    if (this.currentFilter === 'UNREAD') result = result.filter(n => !n.isRead);
    else if (this.currentFilter === 'IMPORTANT') result = result.filter(n => n.priority === 'HIGH');
    else if (this.currentFilter === 'VALIDATION') result = result.filter(n => n.type === 'VALIDATION');
    else if (this.currentFilter === 'PAYMENT') result = result.filter(n => n.type === 'PAYMENT' || n.type === 'INVOICE');
    else if (this.currentFilter === 'SERVICE') result = result.filter(n => n.type === 'SERVICE');
    else if (this.currentFilter === 'COMPLAINT') result = result.filter(n => n.type === 'COMPLAINT');
    else if (this.currentFilter === 'REPORT') result = result.filter(n => n.type === 'REPORT');
    else if (this.currentFilter === 'SUPPORT') result = result.filter(n => n.type === 'SUPPORT');
    else if (this.currentFilter === 'SYSTEM') result = result.filter(n => n.type === 'SYSTEM');

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term) ||
        this.getTypeLabel(n.type).toLowerCase().includes(term)
      );
    }

    if (this.currentSort === 'NEWEST') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (this.currentSort === 'OLDEST') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (this.currentSort === 'PRIORITY') {
      const p: any = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      result.sort((a, b) => p[b.priority] - p[a.priority]);
    }
    else if (this.currentSort === 'UNREAD') result.sort((a, b) => (a.isRead === b.isRead) ? 0 : a.isRead ? 1 : -1);

    this.filteredNotifications = result;
  }

  // Actions
  toggleRead(notif: any, event?: Event): void {
    if (event) event.stopPropagation();
    notif.isRead = !notif.isRead;
    notif.status = notif.isRead ? 'READ' : 'NEW';
    this.saveData();
    this.calculateStats();
    this.applyFilters();
  }

  archive(notif: any, event?: Event): void {
    if (event) event.stopPropagation();
    notif.status = 'ARCHIVED';
    this.saveData();
    this.calculateStats();
    this.applyFilters();
    this.closeDetails();
  }

  delete(notif: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Supprimer cette notification ?')) {
      this.notifications = this.notifications.filter(n => n.id !== notif.id);
      this.saveData();
      this.calculateStats();
      this.applyFilters();
      this.closeDetails();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => {
      if (n.status !== 'ARCHIVED') {
        n.isRead = true;
        n.status = 'READ';
      }
    });
    this.saveAndRefresh();
  }

  deleteRead(): void {
    if (confirm('Supprimer toutes les notifications lues ?')) {
      this.notifications = this.notifications.filter(n => !n.isRead || n.status === 'ARCHIVED');
      this.saveAndRefresh();
    }
  }

  saveAndRefresh(): void {
    this.saveData();
    this.calculateStats();
    this.applyFilters();
  }

  saveData(): void {
    localStorage.setItem('admin_notifications', JSON.stringify(this.notifications));
  }

  openDetails(notif: any): void {
    this.selectedNotification = notif;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedNotification = null;
    this.showDetailsModal = false;
  }

  goToLink(route: string): void {
    this.router.navigateByUrl(route);
  }

  // Labels
  getTypeLabel(type: string): string {
    const labels: any = {
      'VALIDATION': 'Validation',
      'PAYMENT': 'Paiement',
      'INVOICE': 'Facture',
      'SERVICE': 'Service',
      'COMPLAINT': 'Réclamation',
      'REPORT': 'Signalement',
      'SUPPORT': 'Support',
      'SYSTEM': 'Système'
    };
    return labels[type] || type;
  }

  getPriorityLabel(priority: string): string {
    const labels: any = { 'HIGH': 'Haute', 'MEDIUM': 'Moyenne', 'LOW': 'Basse' };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    if (priority === 'HIGH') return 'bg-danger text-white';
    if (priority === 'MEDIUM') return 'bg-warning text-dark';
    return 'bg-light text-muted';
  }

  // Stub method to reset view to backend data
  resetToMocks(): void {
    // Reload notifications from backend to reset any mock/demo data
    this.loadData();
  }

  getTypeIcon(type: string): string {
    const icons: any = {
      'VALIDATION': 'ion-ios-checkmark-circle',
      'PAYMENT': 'ion-ios-card',
      'INVOICE': 'ion-ios-document',
      'SERVICE': 'ion-ios-car',
      'COMPLAINT': 'ion-ios-alert',
      'REPORT': 'ion-ios-warning',
      'SUPPORT': 'ion-ios-help-buoy',
      'SYSTEM': 'ion-ios-settings'
    };
    return icons[type] || 'ion-ios-notifications';
  }


}
