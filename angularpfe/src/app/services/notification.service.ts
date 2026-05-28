import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';

export interface AppNotification {
  id: number;
  type: string;
  label: string;
  description: string;
  time: string;
  icon: string;
  color: string;
  isRead: boolean;
  targetUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private roleService: RoleService
  ) {
    if (this.authService.isLoggedIn()) {
      this.loadAll();
    }
    this.roleService.activeRole$.subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.loadAll();
      }
    });
  }

  /** @deprecated Préférer loadAll() pour garder badge et liste synchronisés. */
  setUnreadCount(_count: number): void {
    this.loadAll();
  }

  private notificationModeParam(): string | undefined {
    const role = this.roleService.getActiveRole();
    if (role === 'ROLE_CLIENT') return 'TENANT';
    if (role === 'ROLE_USER') return 'PASSENGER';
    return undefined;
  }

  public loadAll(): void {
    if (!this.authService.isLoggedIn()) return;

    this.getMyNotifications().subscribe({
      next: (notifs) => {
        const mapped = (notifs || []).map(n => this.mapNotification(n));
        // Le backend filtre déjà par ?mode= ; éviter un second filtre qui masque des notifs.
        const mode = this.notificationModeParam();
        const filtered = mode ? mapped : this.filterForActiveRole(mapped);
        this.notificationsSubject.next(filtered);
        this.unreadCountSubject.next(filtered.filter(n => !n.isRead).length);
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  /** Aligné sur le filtre backend / page notifications (TENANT vs PASSENGER). */
  filterForActiveRole(notifs: AppNotification[]): AppNotification[] {
    const mode = this.notificationModeParam();
    if (!mode) return notifs;
    return notifs.filter(n => this.matchesClientMode(n, mode));
  }

  private matchesClientMode(n: AppNotification, mode: string): boolean {
    const text = `${n.label || ''} ${n.description || ''}`.toLowerCase();
    const hasPassengerKeyword =
      text.includes('course') ||
      text.includes('chauffeur') ||
      text.includes('trajet') ||
      text.includes('passager') ||
      text.includes('covoiturage') ||
      text.includes('réservation') ||
      text.includes('reservation');
    const hasRentalKeyword =
      text.includes('location') ||
      text.includes('véhicule') ||
      text.includes('vehicule') ||
      text.includes('contrat') ||
      text.includes('propriétaire') ||
      text.includes('proprietaire') ||
      text.includes('loué') ||
      text.includes('loue') ||
      text.includes('caution');

    if (mode === 'TENANT') {
      return hasRentalKeyword || !hasPassengerKeyword;
    }
    if (mode === 'PASSENGER') {
      return !hasRentalKeyword;
    }
    return true;
  }

  private mapNotification(backendNotif: any): AppNotification {
    let color = 'blue';
    let icon = 'ion-md-information-circle';
    
    const type = backendNotif.type ? backendNotif.type.toUpperCase() : 'INFO';
    if (type === 'SUCCESS') {
      color = 'green';
      icon = 'ion-md-checkmark-circle';
    } else if (type === 'WARNING') {
      color = 'orange';
      icon = 'ion-md-warning';
    } else if (type === 'DANGER') {
      color = 'red';
      icon = 'ion-md-close-circle';
    } else if (type === 'INFO') {
      color = 'blue';
      icon = 'ion-md-information-circle';
    } else {
      color = 'blue';
      icon = 'ion-md-notifications';
    }

    return {
      id: backendNotif.id,
      type: backendNotif.type || 'info',
      label: backendNotif.title || '',
      description: backendNotif.message || '',
      time: backendNotif.createdAt || new Date().toISOString(),
      icon: icon,
      color: color,
      isRead: !!(backendNotif.isRead ?? backendNotif.read),
      targetUrl: backendNotif.targetUrl
    };
  }

  getMyNotifications(): Observable<any[]> {
    const mode = this.notificationModeParam();
    const url = mode
      ? `${environment.apiUrl}/notifications/me?mode=${mode}`
      : `${environment.apiUrl}/notifications/me`;
    return this.http.get<any[]>(url);
  }

  getUnreadCount(): Observable<{ count: number }> {
    const mode = this.notificationModeParam();
    const url = mode
      ? `${environment.apiUrl}/notifications/me/unread-count?mode=${mode}`
      : `${environment.apiUrl}/notifications/me/unread-count`;
    return this.http.get<{ count: number }>(url);
  }

  markAsRead(id: number): void {
    this.http.put(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.loadAll();
      },
      error: (err) => console.error('Error marking notification as read:', err)
    });
  }

  markAllAsRead(): void {
    this.http.put(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.loadAll();
      },
      error: (err) => console.error('Error marking all notifications as read:', err)
    });
  }

  deleteNotification(id: number): void {
    this.http.delete(`${environment.apiUrl}/notifications/${id}`).subscribe({
      next: () => {
        this.loadAll();
      },
      error: (err) => console.error('Error deleting notification:', err)
    });
  }
}
