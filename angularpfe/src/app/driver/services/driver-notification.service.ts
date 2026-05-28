import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DriverNotification, NotificationSummary } from '../models/driver.models';
import { NotificationService } from '../../services/notification.service';
import { MessagingService } from '../../services/messaging.service';

@Injectable({
  providedIn: 'root'
})
export class DriverNotificationService {
  private notificationsSubject = new BehaviorSubject<DriverNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private messagingService: MessagingService
  ) {
    this.refreshNotifications();
  }

  refreshNotifications(): void {
    this.http.get<any[]>(`${environment.apiUrl}/driver/notifications`).subscribe({
      next: (res) => {
        this.notificationsSubject.next((res || []).map(n => this.normalize(n)));
        this.notificationService.loadAll();
      },
      error: (err) => {
        console.error('Error fetching driver notifications', err);
        this.notificationService.loadAll();
      }
    });
  }

  getNotifications(): Observable<DriverNotification[]> {
    return this.notifications$;
  }

  getSummary(): Observable<NotificationSummary> {
    return this.notifications$.pipe(
      map(notifications => {
        const todayStr = new Date().toISOString().split('T')[0];
        return {
          total: notifications.length,
          unread: notifications.filter(n => !n.read).length,
          important: notifications.filter(n => n.important).length,
          today: notifications.filter(n => n.date && n.date.startsWith(todayStr)).length
        };
      })
    );
  }

  markAsRead(id: string): void {
    const numId = Number(id);
    if (!Number.isFinite(numId)) return;
    this.http.put(`${environment.apiUrl}/notifications/${numId}/read`, {}).subscribe({
      next: () => this.afterMutation(),
      error: (err) => console.error('Error marking notification as read', err)
    });
  }

  markAsUnread(id: string): void {
    const updated = this.notificationsSubject.value.map(n =>
      n.id === id ? { ...n, read: false } : n
    );
    this.notificationsSubject.next(updated);
  }

  markAllAsRead(): void {
    this.http.put(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => this.afterMutation(),
      error: (err) => console.error('Error marking all notifications as read', err)
    });
  }

  deleteNotification(id: string): void {
    const numId = Number(id);
    if (!Number.isFinite(numId)) return;
    this.http.delete(`${environment.apiUrl}/notifications/${numId}`).subscribe({
      next: () => this.afterMutation(),
      error: (err) => console.error('Error deleting notification', err)
    });
  }

  deleteReadNotifications(): void {
    const toDelete = this.notificationsSubject.value.filter(n => n.read);
    if (toDelete.length === 0) return;
    let pending = toDelete.length;
    toDelete.forEach(n => {
      const numId = Number(n.id);
      if (!Number.isFinite(numId)) {
        pending--;
        return;
      }
      this.http.delete(`${environment.apiUrl}/notifications/${numId}`).subscribe({
        next: () => {
          pending--;
          if (pending === 0) this.afterMutation();
        },
        error: () => {
          pending--;
          if (pending === 0) this.afterMutation();
        }
      });
    });
  }

  private afterMutation(): void {
    this.refreshNotifications();
    this.messagingService.requestCountsRefresh();
  }

  private normalize(raw: any): DriverNotification {
    const actionUrl = (raw.actionUrl || raw.targetUrl || '').trim();
    const title = (raw.title || '').toLowerCase();
    const message = (raw.message || '').toLowerCase();
    let type = (raw.type || 'SYSTEM') as DriverNotification['type'];

    if (type === 'SYSTEM' || type === 'INFO' as any) {
      if (title.includes('covoiturage') || message.includes('rejoindre') || title.includes('réservation')) {
        type = 'NEW_REQUEST';
      } else if (title.includes('demande') || message.includes('course disponible')) type = 'NEW_REQUEST';
      else if (title.includes('message')) type = 'NEW_MESSAGE';
      else if (title.includes('paiement')) type = 'PAYMENT_RECEIVED';
      else if (title.includes('revenu')) type = 'EARNING_CREATED';
    }

    const relatedEntityId =
      raw.relatedEntityId != null
        ? String(raw.relatedEntityId)
        : this.extractIdFromUrl(actionUrl);

    return {
      id: String(raw.id),
      type,
      title: raw.title || '',
      message: raw.message || '',
      date: raw.date || raw.createdAt || new Date().toISOString(),
      read: !!(raw.read ?? raw.isRead),
      important: !!raw.important,
      actionUrl,
      relatedEntityId: relatedEntityId || undefined,
      relatedEntityType: relatedEntityId ? 'REQUEST' : undefined
    };
  }

  private extractIdFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:rideId|requestId|bookingId|id)=(\d+)/i);
    return match ? match[1] : null;
  }
}
