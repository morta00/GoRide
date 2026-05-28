import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit {
  activeTab: 'transactions' | 'invoices' | 'refunds' | 'commissions' = 'transactions';
  
  transactions: any[] = [];
  invoices: any[] = [];
  
  filteredTransactions: any[] = [];
  filteredInvoices: any[] = [];
  
  searchTerm: string = '';
  transactionFilter: string = 'ALL';
  invoiceFilter: string = 'ALL';
  currentSort: string = 'NEWEST';
  
  serviceFilterId: string | null = null;

  stats = {
    totalEncashed: 0,
    successCount: 0,
    pendingInvoices: 0,
    refundsCount: 0,
    totalCommissions: 0,
    failedCount: 0
  };

  private apiStats: any = null;
  private readonly outflowTypes = new Set(['DRIVER_PAYOUT', 'OWNER_PAYOUT', 'REFUND']);

  selectedPayment: any = null;
  selectedInvoice: any = null;
  showPaymentModal: boolean = false;
  showInvoiceModal: boolean = false;
  activeDropdownId: string | null = null;

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadData();
    
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'] as any;
      }
      if (params['serviceId']) {
        this.serviceFilterId = params['serviceId'];
        this.searchTerm = params['serviceId'];
      }
      this.applyFilters();
    });
  }

  loadData(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/payments`).subscribe({
      next: (data) => {
        const list = (data || []).map(t => this.normalizeTransaction(t));
        this.transactions = list.length > 0 ? list : this.getDemoPaymentsFallback();
        this.buildInvoicesFromTransactions();
        this.refreshStats();
        this.applyFilters();
      },
      error: () => {
        this.transactions = this.getDemoPaymentsFallback();
        this.buildInvoicesFromTransactions();
        this.refreshStats();
        this.applyFilters();
      }
    });

    this.http.get<any>(`${environment.apiUrl}/admin/payments/stats`).subscribe({
      next: (statsData) => {
        this.apiStats = statsData || null;
        this.refreshStats();
      },
      error: () => {
        this.apiStats = null;
        this.refreshStats();
      }
    });
  }

  /** Merge API stats with totals computed from the transaction list (fixes empty Encaissé). */
  private refreshStats(): void {
    const fromList = this.computeStatsFromTransactions();
    const api = this.apiStats;
    const apiEncashed = Number(api?.totalCollected ?? api?.totalEncashed) || 0;
    const apiCommissions = Number(api?.commissionTotal ?? api?.totalCommissions) || 0;

    this.stats = {
      totalEncashed: apiEncashed > 0 ? apiEncashed : fromList.totalEncashed,
      successCount: Number(api?.successfulCount) > 0 ? Number(api.successfulCount) : fromList.successCount,
      pendingInvoices: Number(api?.pendingInvoices) >= 0 && api?.pendingInvoices != null
        ? Number(api.pendingInvoices) : fromList.pendingInvoices,
      refundsCount: Number(api?.refundCount) >= 0 && api?.refundCount != null
        ? Number(api.refundCount) : fromList.refundsCount,
      totalCommissions: apiCommissions > 0 ? apiCommissions : fromList.totalCommissions,
      failedCount: Number(api?.failedCount) >= 0 && api?.failedCount != null
        ? Number(api.failedCount) : fromList.failedCount
    };
  }

  private computeStatsFromTransactions(): typeof this.stats {
    const paidStatuses = new Set(['PAID', 'COMPLETED']);
    let totalEncashed = 0;
    let successCount = 0;
    let pendingInvoices = 0;
    let refundsCount = 0;
    let totalCommissions = 0;
    let failedCount = 0;

    for (const t of this.transactions) {
      const amount = Number(t.amount) || 0;
      const status = t.status;
      if (paidStatuses.has(status)) {
        successCount++;
        if (!this.outflowTypes.has(t.type)) {
          totalEncashed += amount;
          totalCommissions += Math.round(amount * 0.1 * 100) / 100;
        }
      } else if (status === 'FAILED') {
        failedCount++;
      } else if (status === 'PENDING') {
        pendingInvoices++;
      }
      if (status === 'REFUNDED' || t.type === 'REFUND') {
        refundsCount++;
      }
    }

    return { totalEncashed, successCount, pendingInvoices, refundsCount, totalCommissions, failedCount };
  }

  private getDemoPaymentsFallback(): any[] {
    const rows = [
      ['TX-DEMO-001', 'Location Sfax — Dacia Logan', 'RENTAL', 124, 'PAID', 'Riadh Landolsi'],
      ['TX-DEMO-002', 'Covoiturage Tunis → Sousse', 'PASSENGER_PAYMENT', 16, 'PAID', 'Riadh Landolsi'],
      ['TX-DEMO-003', 'Location Tunis — Peugeot 208', 'RENTAL', 116, 'PAID', 'Riadh Landolsi'],
      ['TX-DEMO-004', 'Commission plateforme — mai 2026', 'GORIDE_COMMISSION', 356, 'PAID', 'Ahmed Abidi'],
      ['TX-DEMO-005', 'Versement chauffeur semaine', 'DRIVER_PAYOUT', 89, 'PAID', 'Imed Kilani'],
      ['TX-DEMO-006', 'Réservation entreprise Sfax', 'COMPANY_PAYMENT', 750, 'PENDING', 'Société GoRide'],
      ['TX-DEMO-007', 'Course Tunis — La Marsa', 'PASSENGER_PAYMENT', 12, 'PAID', 'Riadh Landolsi'],
      ['TX-DEMO-008', 'Remboursement annulation location Tunis', 'REFUND', 58, 'REFUNDED', 'Riadh Landolsi'],
      ['TX-DEMO-009', 'Recharge portefeuille client', 'RECHARGE', 100, 'PAID', 'Riadh Landolsi'],
      ['TX-DEMO-010', 'Paiement carte refusé', 'TRIP', 24, 'FAILED', 'Riadh Landolsi'],
      ['TX-DEMO-011', 'Location Sousse — Polo', 'RENTAL', 150, 'PENDING', 'Amira Gharbi'],
      ['TX-DEMO-012', 'Course Sfax → Gabès', 'PASSENGER_PAYMENT', 62, 'PAID', 'Amira Gharbi']
    ];
    const now = new Date();
    return rows.map((r, i) => this.normalizeTransaction({
      id: `demo-pay-${i + 1}`,
      transactionId: r[0],
      displayId: r[0],
      title: r[1],
      type: r[2],
      amount: r[3],
      status: r[4],
      createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
      user: { firstName: String(r[5]).split(' ')[0], lastName: String(r[5]).split(' ').slice(1).join(' ') }
    }));
  }

  private normalizeTransaction(t: any): any {
    const status = t.status === 'COMPLETED' ? 'PAID' : t.status;
    const payerName = t.user
      ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim()
      : 'Client GoRide';
    const amount = Number(t.amount) || 0;
    return {
      ...t,
      status,
      displayId: t.displayId || t.transactionId || `TX-${t.id}`,
      payerName,
      receiverName: t.receiverName || 'GoRide Plateforme',
      serviceLabel: t.title || 'Transaction GoRide',
      commission: Math.round(amount * 0.1 * 100) / 100,
      netAmount: Math.round(amount * 0.9 * 100) / 100,
      method: t.type === 'REFUND' ? 'BANK_TRANSFER' : 'CARD',
      date: t.createdAt || new Date().toISOString(),
      relatedServiceId: t.transactionId || t.displayId
    };
  }

  private buildInvoicesFromTransactions(): void {
    const invoiceSources = this.transactions.filter(
      t => t.type === 'COMPANY_PAYMENT' || t.type === 'RENTAL' || t.status === 'PENDING'
    );
    this.invoices = invoiceSources.map((t, index) => {
      const num = `FAC-2026-${String(101 + index).padStart(3, '0')}`;
      return {
        id: `inv-${t.id}`,
        invoiceNumber: num,
        invoiceId: num,
        clientName: t.payerName,
        total: t.amount,
        amount: t.amount,
        status: t.status === 'PAID' ? 'PAID' : 'PENDING',
        issueDate: t.date,
        date: t.date,
        serviceLabel: t.serviceLabel,
        relatedServiceId: t.relatedServiceId
      };
    });
  }

  private asSearchText(value: any): string {
    return value == null ? '' : String(value).toLowerCase();
  }

  calculateStats(): void {
    this.refreshStats();
  }

  switchTab(tab: any): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filterTransactions();
    this.filterInvoices();
  }

  filterTransactions(): void {
    let result = [...this.transactions];

    if (this.activeTab === 'refunds') {
      result = result.filter(t => t.type === 'REFUND');
    } else if (this.activeTab === 'commissions') {
      result = result.filter(t => t.type === 'COMMISSION' || t.type === 'GORIDE_COMMISSION');
    }
    
    // Status Filter
    if (this.transactionFilter === 'PAID') result = result.filter(t => t.status === 'PAID');
    else if (this.transactionFilter === 'PENDING') result = result.filter(t => t.status === 'PENDING');
    else if (this.transactionFilter === 'FAILED') result = result.filter(t => t.status === 'FAILED');
    else if (this.transactionFilter === 'REFUNDED') result = result.filter(t => t.type === 'REFUND');
    
    // Role Filter (Custom logic for the demo)
    else if (this.transactionFilter === 'COMPANY') result = result.filter(t => t.type === 'COMPANY_PAYMENT' || t.payerName.includes('SARL') || t.payerName.includes('Banque') || t.payerName.includes('Hôtel'));
    else if (this.transactionFilter === 'PASSENGER') result = result.filter(t => t.type === 'PASSENGER_PAYMENT');
    else if (this.transactionFilter === 'DRIVER') result = result.filter(t => t.type === 'DRIVER_PAYOUT' || t.receiverName.includes('Ahmed'));

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        this.asSearchText(t.payerName).includes(term) ||
        this.asSearchText(t.receiverName).includes(term) ||
        this.asSearchText(t.serviceLabel).includes(term) ||
        this.asSearchText(t.displayId).includes(term) ||
        this.asSearchText(t.id).includes(term) ||
        this.asSearchText(t.transactionId).includes(term) ||
        this.asSearchText(t.relatedServiceId).includes(term) ||
        this.asSearchText(t.invoiceId).includes(term)
      );
    }

    // Sort
    this.sortData(result, 'transactions');
  }

  filterInvoices(): void {
    let result = [...this.invoices];
    
    if (this.invoiceFilter !== 'ALL') {
      result = result.filter(i => i.status === this.invoiceFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(i => 
        i.invoiceNumber.toLowerCase().includes(term) ||
        i.clientName.toLowerCase().includes(term) ||
        i.serviceLabel.toLowerCase().includes(term) ||
        (i.relatedServiceId && i.relatedServiceId.toLowerCase().includes(term))
      );
    }

    this.sortData(result, 'invoices');
  }

  sortData(data: any[], type: 'transactions' | 'invoices'): void {
    if (this.currentSort === 'NEWEST') {
      data.sort((a, b) => new Date(b.date || b.issueDate).getTime() - new Date(a.date || a.issueDate).getTime());
    } else if (this.currentSort === 'OLDEST') {
      data.sort((a, b) => new Date(a.date || a.issueDate).getTime() - new Date(b.date || b.issueDate).getTime());
    } else if (this.currentSort === 'AMOUNT_DESC') {
      data.sort((a, b) => (b.amount || b.total) - (a.amount || a.total));
    } else if (this.currentSort === 'AMOUNT_ASC') {
      data.sort((a, b) => (a.amount || a.total) - (b.amount || b.total));
    }

    if (type === 'transactions') this.filteredTransactions = data;
    else this.filteredInvoices = data;
  }

  clearServiceFilter(): void {
    this.serviceFilterId = null;
    this.searchTerm = '';
    this.applyFilters();
    // Update URL without reloading
    this.router.navigate([], { queryParams: { serviceId: null, tab: this.activeTab }, queryParamsHandling: 'merge' });
  }

  // Labels
  getTypeLabel(type: string): string {
    const labels: any = {
      'PASSENGER_PAYMENT': 'Paiement passager',
      'TENANT_PAYMENT': 'Paiement locataire',
      'COMPANY_PAYMENT': 'Paiement entreprise',
      'DRIVER_PAYOUT': 'Versement chauffeur',
      'OWNER_PAYOUT': 'Versement propriétaire',
      'GORIDE_COMMISSION': 'Commission GoRide',
      'COMMISSION': 'Commission GoRide',
      'REFUND': 'Remboursement',
      'RENTAL': 'Location véhicule',
      'TRIP': 'Course / covoiturage',
      'RECHARGE': 'Recharge portefeuille'
    };
    return labels[type] || 'Transaction';
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'PAID': 'Payé',
      'PENDING': 'En attente',
      'FAILED': 'Échoué',
      'REFUNDED': 'Remboursé',
      'COMPLETED': 'Payé',
      'CANCELLED': 'Annulé',
      'OVERDUE': 'En retard'
    };
    return labels[status] || status;
  }

  getMethodLabel(method: string): string {
    const labels: any = {
      'CARD': 'Carte Bancaire',
      'CASH': 'Espèces',
      'BANK_TRANSFER': 'Virement',
      'GORIDE_WALLET': 'Portefeuille'
    };
    return labels[method] || method;
  }

  getStatusClass(status: string): string {
    if (status === 'PAID') return 'bg-success-soft text-success';
    if (status === 'PENDING') return 'bg-warning-soft text-warning';
    if (status === 'FAILED' || status === 'OVERDUE') return 'bg-danger-soft text-danger';
    if (status === 'REFUNDED' || status === 'REFUND') return 'bg-info-soft text-info';
    if (status === 'CANCELLED') return 'bg-light text-muted';
    return 'bg-light';
  }

  // Modals
  openPaymentDetails(payment: any): void {
    this.selectedPayment = { ...payment };
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPayment = null;
  }

  openInvoiceDetails(invoice: any): void {
    this.selectedInvoice = { ...invoice };
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.selectedInvoice = null;
  }

  toggleDropdown(id: string, event: Event): void {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  closeDropdowns(): void {
    this.activeDropdownId = null;
  }

  // Actions
  markAsPaid(item: any, type: 'payment' | 'invoice'): void {
    if (confirm('Marquer comme payé ? Cette action est irréversible.')) {
      if (type === 'payment') {
        const idx = this.transactions.findIndex(t => t.id === item.id);
        if (idx !== -1) {
          this.transactions[idx].status = 'PAID';
          // Also sync with invoice if exists
          if (item.invoiceId) {
            const invIdx = this.invoices.findIndex(i => i.invoiceNumber === item.invoiceId);
            if (invIdx !== -1) this.invoices[invIdx].status = 'PAID';
          }
        }
      } else {
        const idx = this.invoices.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          this.invoices[idx].status = 'PAID';
          // Also sync with payment if exists
          const trxIdx = this.transactions.findIndex(t => t.invoiceId === item.invoiceNumber);
          if (trxIdx !== -1) this.transactions[trxIdx].status = 'PAID';
        }
      }
      this.saveAndRefresh();
    }
  }

  cancelPayment(payment: any): void {
    if (confirm('Annuler ce paiement ?')) {
      const idx = this.transactions.findIndex(t => t.id === payment.id);
      if (idx !== -1) {
        this.transactions[idx].status = 'CANCELLED';
        this.saveAndRefresh();
      }
    }
  }

  saveAndRefresh(): void {
    localStorage.setItem('admin_payments', JSON.stringify(this.transactions));
    localStorage.setItem('admin_invoices', JSON.stringify(this.invoices));
    this.loadData();
    this.applyFilters();
    this.closePaymentModal();
    this.closeInvoiceModal();
  }

  printInvoice(): void {
    window.print();
  }

  goToService(id: string): void {
    this.router.navigate(['/admin/services'], { queryParams: { searchTerm: id } });
  }

  goToSupport(id: string): void {
    this.router.navigate(['/admin/support'], { queryParams: { serviceId: id } });
  }
}
