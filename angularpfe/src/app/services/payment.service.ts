import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface PaymentMethod {
  id: number;
  name: string;
  details: string;
  icon: string;
  isPrincipal: boolean;
  expiry?: string;
}

export interface PaymentSummary {
  totalSpent: number;
  blockedDeposits: number;
  refunds: number;
  monthlyTransactionsCount: number;
  monthlyPaymentCount?: number;
  monthlyWalletTopups?: number;
  gorideBalance: number;
  activeDeposit: {
    vehicleName: string;
    amount: number;
    status: string;
    releaseDate: string;
  } | null;
}

export interface Transaction {
  id: number;
  details: string;
  date: string;
  method: string;
  amount: number;
  status: string;
  type: string;
  transactionId?: string;
  relatedReservationId?: number;
  relatedVehicleName?: string;
  label?: string; // Optional for backward compatibility
}

export interface Invoice {
  id?: number;
  invoiceNumber: string;
  reservationId: number;
  clientName: string;
  vehicleName: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalPrice: number;
  depositAmount: number;
  paymentStatus: string;
  createdAt: string;
  status: string;
  
  // Retro compatibility
  number?: string;
  vehicle?: string;
  owner?: string;
  date?: string;
  period?: string;
  amount?: number;
  paymentMethod?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  private paymentMethods: PaymentMethod[] = [
    { id: 1, name: 'Visa', details: '**** 4242', expiry: '12/26', icon: 'ion-logo-visa', isPrincipal: true },
    { id: 2, name: 'Mastercard', details: '**** 5580', expiry: '08/25', icon: 'ion-md-card', isPrincipal: false },
    { id: 3, name: 'D17', details: '**** 7812', icon: 'ion-md-phone-portrait', isPrincipal: false },
    { id: 4, name: 'Espèces', details: 'Disponible à la remise', icon: 'ion-md-cash', isPrincipal: false }
  ];

  private methodsSource = new BehaviorSubject<PaymentMethod[]>(this.paymentMethods);
  private summarySource = new BehaviorSubject<PaymentSummary | null>(null);
  private transactionsSource = new BehaviorSubject<Transaction[]>([]);
  private invoicesSource = new BehaviorSubject<Invoice[]>([]);

  paymentMethods$ = this.methodsSource.asObservable();
  summary$ = this.summarySource.asObservable();
  transactions$ = this.transactionsSource.asObservable();
  invoices$ = this.invoicesSource.asObservable();

  constructor(private http: HttpClient) { }

  getSummary(): Observable<PaymentSummary> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/summary`).pipe(
      map(raw => this.normalizeSummary(raw)),
      tap(data => this.summarySource.next(data))
    );
  }

  private normalizeSummary(raw: Record<string, unknown> | null | undefined): PaymentSummary {
    const r = raw ?? {};
    const balance = this.readBalance(r);
    return {
      totalSpent: Number(r['totalSpent'] ?? 0),
      blockedDeposits: Number(r['blockedDeposits'] ?? 0),
      refunds: Number(r['refunds'] ?? 0),
      monthlyTransactionsCount: Number(r['monthlyPaymentCount'] ?? r['monthlyTransactionsCount'] ?? 0),
      monthlyPaymentCount: Number(r['monthlyPaymentCount'] ?? r['monthlyTransactionsCount'] ?? 0),
      monthlyWalletTopups: Number(r['monthlyWalletTopups'] ?? 0),
      gorideBalance: balance,
      activeDeposit: (r['activeDeposit'] as PaymentSummary['activeDeposit']) ?? null
    };
  }

  private readBalance(raw: Record<string, unknown>): number {
    const v = raw['gorideBalance'] ?? raw['goride_balance'] ?? raw['walletBalance'] ?? raw['wallet_balance'];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`).pipe(
      tap(data => this.transactionsSource.next(data))
    );
  }

  getInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`).pipe(
      tap(data => {
        // Map backend to frontend fields for retro compatibility
        const mappedData = data.map(i => ({
          ...i,
          id: i.reservationId,
          number: i.invoiceNumber,
          vehicle: i.vehicleName,
          owner: i.ownerName,
          date: new Date(i.createdAt).toLocaleDateString(),
          period: `${new Date(i.startDate).toLocaleDateString()} - ${new Date(i.endDate).toLocaleDateString()}`,
          amount: i.totalPrice,
          paymentMethod: 'Carte Bancaire', // Default
          status: i.status === 'PAID' ? 'Payée' : i.status
        })) as any[];
        this.invoicesSource.next(mappedData);
      })
    );
  }

  getTransactionDetails(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}`);
  }

  rechargeWallet(amount: number, method: string): Observable<{ transaction: Transaction; summary: PaymentSummary }> {
    return this.http.post<Record<string, unknown>>(`${this.apiUrl}/wallet/recharge`, { amount, method }).pipe(
      map(res => ({
        transaction: res['transaction'] as Transaction,
        summary: this.normalizeSummary((res['summary'] as Record<string, unknown>) ?? res)
      }))
    );
  }

  getInvoiceDetails(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.apiUrl}/invoices/${id}`);
  }

  // --- Profile Component Methods ---
  getPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods;
  }

  setPrincipalMethod(id: number): void {
    this.paymentMethods = this.paymentMethods.map(m => ({
      ...m,
      isPrincipal: m.id === id
    }));
    this.methodsSource.next(this.paymentMethods);
  }

  deleteMethod(id: number): void {
    this.paymentMethods = this.paymentMethods.filter(m => m.id !== id);
    if (this.paymentMethods.length > 0 && !this.paymentMethods.some(m => m.isPrincipal)) {
      this.paymentMethods[0].isPrincipal = true;
    }
    this.methodsSource.next(this.paymentMethods);
  }
}
