import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { PaymentService } from '../../../services/payment.service';
import { SearchService } from '../../../services/search.service';
import { Subscription, forkJoin } from 'rxjs';

export interface Transaction {
  id: string;
  type: "PAYMENT" | "REFUND" | "SHARED_RIDE_PAYMENT" | "WALLET_TOPUP";
  title: string;
  description: string;
  rideId?: string;
  amount: number;
  method: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
  date: string;
  route?: string;
  driverName?: string;
  receiptNumber: string;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  
  // Financial Summary
  totalSpent = 0;
  totalPayments = 0;
  totalRefunds = 0;
  walletBalance = 0;
  walletRechargesCount = 0;
  loyaltyPoints = 0;
  couponsAvailable = 0;

  // Search & Filters
  searchTerm: string = '';
  activeTypeFilter: string = 'ALL';
  activeStatusFilter: string = 'ALL';
  activeMethodFilter: string = 'ALL';
  sortOrder: string = 'RECENT';

  // Modals
  selectedTransaction: Transaction | null = null;
  showDetailsModal = false;
  showReceiptModal = false;
  showRechargeModal = false;
  showBenefitsModal = false;

  // Recharge form
  rechargeAmount: number = 0;
  rechargeMethod: string = 'Carte bancaire';

  userName: string = 'Passager';
  private searchSub?: Subscription;

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = `${user.firstName} ${user.lastName}`;
    }
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadData(): void {
    forkJoin({
      summary: this.paymentService.getSummary(),
      transactions: this.paymentService.getTransactions()
    }).subscribe({
      next: ({ summary, transactions }) => {
        this.applySummary(summary);
        this.transactions = (transactions || []).map((t: any) => {
          const txType = this.mapTransactionType(t.type, t.details);
          const row: Transaction = {
          id: String(t.id),
          type: txType,
          title: t.details || 'Paiement GoRide',
          description: t.details || 'Transaction réalisée sur GoRide',
          rideId: t.relatedReservationId ? String(t.relatedReservationId) : undefined,
          amount: Math.abs(Number(t.amount) || 0),
          method: txType === 'WALLET_TOPUP' ? 'Crédit solde' : (t.method || 'Carte bancaire'),
          status: this.mapTransactionStatus(t.status),
          date: t.date || new Date().toISOString(),
          route: t.relatedVehicleName || 'Course GoRide',
          driverName: t.relatedVehicleName ? 'Chauffeur' : undefined,
          receiptNumber: t.transactionId || 'REC-' + Math.floor(100000 + Math.random() * 900000)
          };
          return row;
        });
        this.syncWalletFromTransactions();
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => console.error('Error fetching payments data', err)
    });
  }

  private applySummary(summary: {
    totalSpent?: number;
    refunds?: number;
    gorideBalance?: number;
    monthlyTransactionsCount?: number;
    monthlyPaymentCount?: number;
    monthlyWalletTopups?: number;
    walletBalance?: number;
  } | null): void {
    if (!summary) return;
    this.totalSpent = summary.totalSpent ?? 0;
    this.totalRefunds = summary.refunds ?? 0;
    this.totalPayments = summary.monthlyPaymentCount ?? summary.monthlyTransactionsCount ?? 0;
    this.walletRechargesCount = summary.monthlyWalletTopups ?? 0;
    const bal = Number(summary.gorideBalance ?? summary.walletBalance);
    if (Number.isFinite(bal)) {
      this.walletBalance = bal;
    }
  }

  /** Solde = somme des recharges payées (source fiable si le champ user.wallet_balance est en retard). */
  private syncWalletFromTransactions(): void {
    const fromTopups = this.transactions
      .filter(t => this.isWalletTopup(t) && t.status === 'PAID')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (fromTopups > 0) {
      this.walletBalance = fromTopups;
    }
  }

  private isWalletTopup(t: Transaction): boolean {
    if (t.type === 'WALLET_TOPUP') return true;
    const label = `${t.title} ${t.description}`.toLowerCase();
    return label.includes('recharge solde') || label.includes('recharge portefeuille');
  }

  private mapTransactionType(type: string, details?: string): Transaction['type'] {
    const t = (type || '').toUpperCase();
    const d = (details || '').toLowerCase();
    if (t === 'REFUND') return 'REFUND';
    if (t === 'WALLET_TOPUP' || t === 'TOPUP' || t === 'RECHARGE') return 'WALLET_TOPUP';
    if (d.includes('recharge solde') || d.includes('recharge portefeuille')) return 'WALLET_TOPUP';
    if (t === 'SHARED_RIDE_PAYMENT' || t === 'SHARED') return 'SHARED_RIDE_PAYMENT';
    return 'PAYMENT';
  }

  private mapTransactionStatus(status: string): any {
    const s = (status || '').toUpperCase();
    if (s === 'REFUNDED') return 'REFUNDED';
    if (s === 'PENDING') return 'PENDING';
    if (s === 'FAILED') return 'FAILED';
    return 'PAID';
  }

  syncPayments(current: Transaction[]): Transaction[] {
    return current;
  }

  getMockTransactions(): Transaction[] {
    return [];
  }

  calculateStats(): void {
    this.totalSpent = this.transactions
      .filter(t => t.status === 'PAID' && (t.type === 'PAYMENT' || t.type === 'SHARED_RIDE_PAYMENT'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    this.totalPayments = this.transactions.filter(
      t => t.type === 'PAYMENT' || t.type === 'SHARED_RIDE_PAYMENT'
    ).length;

    this.walletRechargesCount = this.transactions.filter(t => this.isWalletTopup(t)).length;

    this.totalRefunds = this.transactions
      .filter(t => t.status === 'REFUNDED' || t.type === 'REFUND')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    this.syncWalletFromTransactions();
  }

  applyFilters(): void {
    let result = [...this.transactions];

    // Search
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        (t.route || '').toLowerCase().includes(q) ||
        (t.driverName || '').toLowerCase().includes(q) ||
        t.method.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      );
    }

    // Filters
    if (this.activeTypeFilter !== 'ALL') result = result.filter(t => t.type === this.activeTypeFilter);
    if (this.activeStatusFilter !== 'ALL') result = result.filter(t => t.status === this.activeStatusFilter);
    if (this.activeMethodFilter !== 'ALL') result = result.filter(t => t.method === this.activeMethodFilter);

    // Sort
    result.sort((a, b) => {
      if (this.sortOrder === 'RECENT') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (this.sortOrder === 'OLDEST') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (this.sortOrder === 'AMOUNT_ASC') return a.amount - b.amount;
      if (this.sortOrder === 'AMOUNT_DESC') return b.amount - a.amount;
      return 0;
    });

    this.filteredTransactions = result;
  }

  openDetails(t: Transaction): void {
    this.selectedTransaction = t;
    this.showDetailsModal = true;
  }

  openReceipt(t: Transaction): void {
    this.selectedTransaction = t;
    this.showReceiptModal = true;
  }

  confirmRecharge(): void {
    if (this.rechargeAmount <= 0) return;

    const amount = Number(this.rechargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Montant invalide.');
      return;
    }

    this.paymentService.rechargeWallet(amount, this.rechargeMethod).subscribe({
      next: (res) => {
        if (res.summary) {
          this.applySummary(res.summary);
        }
        this.showRechargeModal = false;
        this.rechargeAmount = 0;
        this.loadData();
        alert('Votre solde a été rechargé avec succès !');
      },
      error: (err) => {
        console.error('Recharge failed', err);
        alert(err.error?.message || 'Échec de la recharge. Réessayez.');
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  downloadReceipt(): void {
    alert('Téléchargement du reçu simulé pour la démo.');
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'PAID': return 'Payé';
      case 'PENDING': return 'En attente';
      case 'REFUNDED': return 'Remboursé';
      case 'FAILED': return 'Échoué';
      default: return status;
    }
  }

  getIcon(type: string): string {
    switch(type) {
      case 'PAYMENT': return 'ion-md-car';
      case 'SHARED_RIDE_PAYMENT': return 'ion-md-people';
      case 'REFUND': return 'ion-md-refresh';
      case 'WALLET_TOPUP': return 'ion-md-wallet';
      default: return 'ion-md-cash';
    }
  }
}
