import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HistoryItem, HistorySummary } from '../models/driver.models';

@Injectable({
  providedIn: 'root'
})
export class DriverHistoryService {
  private historySubject = new BehaviorSubject<HistoryItem[]>([]);
  history$ = this.historySubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshHistory();
  }

  refreshHistory(): void {
    this.http.get<any>(`${environment.apiUrl}/driver/history`).subscribe({
      next: (res) => {
        if (res && res.items) {
          this.historySubject.next(res.items);
        }
      },
      error: (err) => {
        console.error('Error fetching history', err);
      }
    });
  }

  getHistory(): Observable<HistoryItem[]> {
    return this.history$;
  }

  getSummary(): Observable<HistorySummary> {
    return this.history$.pipe(
      map(history => {
        const completedTrips = history.filter(h => h.type === 'TRIP_COMPLETED').length;
        const cancelledTrips = history.filter(h => h.type === 'TRIP_CANCELLED').length;
        const totalEarnings = history
          .filter(h => h.type === 'EARNING_CREATED' && h.amount)
          .reduce((sum, h) => sum + (h.amount || 0), 0);
        const totalReviews = history.filter(h => h.type === 'REVIEW_RECEIVED').length;

        return {
          completedTrips,
          cancelledTrips,
          totalEarnings,
          totalReviews
        };
      })
    );
  }

  getHistoryDetails(id: string): Observable<HistoryItem | undefined> {
    return this.history$.pipe(
      map(list => list.find(h => h.id === id))
    );
  }

  addHistoryItem(item: HistoryItem): void {
    const current = this.historySubject.value;
    this.historySubject.next([item, ...current]);
  }
}
