import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DriverTransaction {
  id: string;
  date: string;
  reference: string;
  type: 'VERSEMEMENT_RECU' | 'RETRAIT_DEMANDE' | 'BONUS' | 'AJUSTEMENT';
  amount: number;
  method: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED';
  note?: string;
}

export interface DriverPaymentSummary {
  availableBalance: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  nextPayout: string;
}

@Injectable({
  providedIn: 'root'
})
export class DriverPaymentService {
  private summarySubject = new BehaviorSubject<DriverPaymentSummary>({
    availableBalance: 0,
    pendingEarnings: 0,
    totalWithdrawn: 0,
    nextPayout: ''
  });
  private transactionsSubject = new BehaviorSubject<DriverTransaction[]>([]);

  summary$ = this.summarySubject.asObservable();
  transactions$ = this.transactionsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshPayments();
  }

  refreshPayments(): void {
    this.http.get<any>(`${environment.apiUrl}/driver/payments`).subscribe({
      next: (res) => {
        if (res) {
          this.summarySubject.next(res.summary || {
            availableBalance: 0,
            pendingEarnings: 0,
            totalWithdrawn: 0,
            nextPayout: ''
          });
          this.transactionsSubject.next(res.transactions || res.payments || []);
        }
      },
      error: (err) => {
        console.error('Error fetching payments from backend', err);
      }
    });
  }

  getPaymentPreference(): any {
    return {
      method: 'bank',
      holder: 'Chauffeur GoRide',
      number: '•••• 1234',
      status: 'verified',
      typeLabel: 'Virement bancaire'
    };
  }

  requestWithdrawal(amount: number, method: string, note?: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/driver/payments/withdraw`, {
      amount,
      method,
      note
    }).pipe(
      tap(() => {
        this.refreshPayments();
      })
    );
  }
}
