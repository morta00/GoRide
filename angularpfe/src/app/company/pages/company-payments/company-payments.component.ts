import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-payments',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './company-payments.component.html',
  styleUrls: ['./company-payments.component.css']
})
export class CompanyPaymentsComponent implements OnInit, OnDestroy {
  invoices: any[] = [];
  payments: any[] = [];
  filteredItems: any[] = [];
  
  searchTerm = '';
  filterType = 'ALL';
  sortBy = 'NEWEST';

  stats = {
    totalSpent: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    refunds: 0
  };

  showInvoiceModal = false;
  showPaymentModal = false;
  showReceiptModal = false;
  showDetailsModal = false;
  
  selectedInvoice: any = null;
  selectedPayment: any = null;

  paymentSettings: any = null;
  companySettings: any = null;
  
  showPinInput = false;
  paymentPin = "";
  pinError = "";

  private searchSub?: Subscription;

  constructor(
    private companyService: CompanyService,
    private route: ActivatedRoute,
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
    this.loadData();
    this.loadPaymentSettings();
    this.loadCompanySettings();
  }

  loadCompanySettings(): void {
    this.companyService.getSettings().subscribe({
      next: (settingsStr) => {
        if (settingsStr && settingsStr !== '{}') {
          this.companySettings = JSON.parse(settingsStr);
        }
      }
    });
  }

  loadPaymentSettings(): void {
    this.paymentSettings = {
      preferredPaymentMethod: "Carte bancaire entreprise",
      methods: [
        { id: "CARD_COMPANY", label: "Carte bancaire entreprise", details: "Visa *** 4455", active: true },
        { id: "BANK_TRANSFER", label: "Virement bancaire", details: "IBAN TN03 224...", active: true },
        { id: "GOCORP_BALANCE", label: "Solde GoCorp", details: "1 250 DT disponibles", active: true }
      ]
    };
  }

  updatePreferredMethod(methodLabel: string): void {
    this.paymentSettings.preferredPaymentMethod = methodLabel;
  }

  loadData(): void {
    this.companyService.getPayments().subscribe({
      next: (payData) => {
        if (payData) {
          this.applyPaymentsFromApi(payData);
          if (payData.paymentMethods?.length) {
            this.paymentSettings = {
              preferredPaymentMethod: 'Carte bancaire entreprise',
              methods: payData.paymentMethods
            };
          }
        } else {
          this.applyDemoPaymentsData();
        }
        this.applyFilters();
      },
      error: () => {
        this.applyDemoPaymentsData();
        this.applyFilters();
      }
    });
  }

  private applyPaymentsFromApi(payData: any): void {
    const transactions = payData.transactions || payData.invoices || [];
    if (!transactions.length) {
      this.applyDemoPaymentsData();
      return;
    }

    const normalized = transactions.map((t: any) => this.normalizeTx(t));

    this.invoices = normalized
      .filter((t: any) => t.status === 'PENDING')
      .map((t: any) => this.toInvoiceItem(t));

    this.payments = normalized
      .filter((t: any) => t.status === 'PAID' || t.status === 'REFUNDED')
      .map((t: any) => this.toPaymentItem(t));

    if (!this.invoices.length && !this.payments.length) {
      this.invoices = normalized.map((t: any) => this.toInvoiceItem(t));
      this.payments = normalized.filter((t: any) => t.status === 'PAID').map((t: any) => this.toPaymentItem(t));
    }

    const summary = payData.summary || {};
    this.stats = {
      totalSpent: Number(summary.totalSpent) || this.sumPaid(this.payments),
      pendingInvoices: Number(summary.pendingInvoices) || this.invoices.length,
      paidInvoices: Number(summary.paidInvoices) || this.payments.filter(p => p.status === 'PAID').length,
      refunds: Number(summary.refunds) || normalized.filter((t: any) => t.status === 'REFUNDED').length
    };
  }

  private normalizeTx(t: any): any {
    const status = t.status === 'COMPLETED' ? 'PAID' : (t.status || 'PENDING');
    return {
      id: t.id,
      transactionId: t.transactionId,
      title: t.title || t.description || 'Paiement entreprise',
      amount: Number(t.amount) || 0,
      type: t.type,
      status,
      createdAt: t.createdAt || new Date().toISOString()
    };
  }

  private toInvoiceItem(t: any): any {
    return {
      id: t.id,
      invoiceNumber: t.transactionId ? String(t.transactionId).replace('TX-', 'FAC-') : `FAC-${t.id}`,
      serviceTitle: t.title,
      amount: t.amount,
      status: t.status === 'PAID' ? 'PAID' : 'PENDING',
      date: t.createdAt
    };
  }

  private toPaymentItem(t: any): any {
    return {
      id: t.id,
      title: t.title,
      serviceTitle: t.title,
      amount: t.amount,
      method: this.formatPaymentMethod(t.type),
      type: t.type,
      status: t.status === 'REFUNDED' ? 'REFUNDED' : 'PAID',
      date: t.createdAt
    };
  }

  private formatPaymentMethod(type: string): string {
    const labels: Record<string, string> = {
      COMPANY_PAYMENT: 'Carte bancaire entreprise',
      CARD: 'Carte bancaire',
      BANK_TRANSFER: 'Virement bancaire',
      REFUND: 'Remboursement',
      RENTAL: 'Location véhicule'
    };
    return labels[type] || 'Virement bancaire';
  }

  private sumPaid(payments: any[]): number {
    return payments
      .filter(p => p.status === 'PAID' && p.type !== 'REFUND')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  private applyDemoPaymentsData(): void {
    const now = Date.now();
    const day = 86400000;
    this.invoices = [
      {
        id: 'demo-inv-1',
        invoiceNumber: 'FAC-2026-204',
        serviceTitle: 'Réservation flotte été — acompte',
        amount: 750,
        status: 'PENDING',
        date: new Date(now - 2 * day).toISOString()
      },
      {
        id: 'demo-inv-2',
        invoiceNumber: 'FAC-2026-198',
        serviceTitle: 'Chauffeurs dédiés — semaine 23',
        amount: 420,
        status: 'PENDING',
        date: new Date(now - 5 * day).toISOString()
      }
    ];
    this.payments = [
      {
        id: 'demo-pay-1',
        title: 'Flotte Sfax — 3 véhicules utilitaires',
        serviceTitle: 'Flotte Sfax — 3 véhicules utilitaires',
        amount: 1250,
        method: 'Carte bancaire entreprise',
        type: 'COMPANY_PAYMENT',
        status: 'PAID',
        date: new Date(now - 18 * day).toISOString()
      },
      {
        id: 'demo-pay-2',
        title: 'Chauffeurs dédiés — semaine 22',
        serviceTitle: 'Chauffeurs dédiés — semaine 22',
        amount: 890,
        method: 'Carte bancaire entreprise',
        type: 'COMPANY_PAYMENT',
        status: 'PAID',
        date: new Date(now - 12 * day).toISOString()
      },
      {
        id: 'demo-pay-3',
        title: 'Location Peugeot 508 — mission Tunis',
        serviceTitle: 'Location Peugeot 508 — mission Tunis',
        amount: 420,
        method: 'Virement bancaire',
        type: 'COMPANY_PAYMENT',
        status: 'PAID',
        date: new Date(now - 8 * day).toISOString()
      },
      {
        id: 'demo-pay-4',
        title: 'Remboursement annulation mission',
        serviceTitle: 'Remboursement annulation mission',
        amount: 120,
        method: 'Remboursement',
        type: 'REFUND',
        status: 'REFUNDED',
        date: new Date(now - 25 * day).toISOString()
      }
    ];
    this.stats = {
      totalSpent: 2560,
      pendingInvoices: 2,
      paidInvoices: 3,
      refunds: 1
    };
  }

  applyFilters(): void {
    let all = [
      ...this.invoices.map(i => ({ ...i, itemType: 'INVOICE' })),
      ...this.payments.map(p => ({ ...p, itemType: 'PAYMENT' }))
    ];

    const q = this.searchTerm.toLowerCase().trim();
    if (q) {
      all = all.filter(item => 
        (item.invoiceNumber || '').toLowerCase().includes(q) ||
        (item.serviceTitle || '').toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    }

    if (this.filterType !== 'ALL') {
      if (this.filterType === 'PENDING') all = all.filter(i => i.itemType === 'INVOICE' && i.status === 'PENDING');
      else if (this.filterType === 'PAID_INVOICES') all = all.filter(i => i.itemType === 'INVOICE' && i.status === 'PAID');
      else if (this.filterType === 'PAYMENTS') all = all.filter(i => i.itemType === 'PAYMENT');
      else if (this.filterType === 'REFUNDS') all = all.filter(i => i.itemType === 'PAYMENT' && i.type === 'REFUND');
    }

    all.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (this.sortBy === 'NEWEST') return dateB - dateA;
      if (this.sortBy === 'OLDEST') return dateA - dateB;
      if (this.sortBy === 'AMOUNT_ASC') return a.amount - b.amount;
      if (this.sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
      return 0;
    });

    this.filteredItems = all;
  }

  openInvoice(invoice: any): void {
    this.selectedInvoice = invoice;
    this.showInvoiceModal = true;
  }

  openPayModal(invoice: any): void {
    this.selectedInvoice = invoice;
    this.showPaymentModal = true;
  }

  processPayment(method: string): void {
    if (!this.selectedInvoice) return;

    if (this.companySettings?.displayAndSecurity?.paymentPinEnabled) {
      this.showPinInput = true;
      this.showPaymentModal = false;
      return;
    }

    this.executePayment(method);
  }

  verifyPinAndPay(): void {
    if (this.paymentPin === "1234") {
      this.executePayment(this.paymentSettings?.preferredPaymentMethod || "Carte");
      this.showPinInput = false;
      this.paymentPin = "";
      this.pinError = "";
    } else {
      this.pinError = "Code PIN incorrect (Demo: 1234)";
    }
  }

  executePayment(method: string): void {
    if (!this.selectedInvoice) return;

    this.selectedInvoice.status = 'PAID';
    const invoiceIndex = this.invoices.findIndex(i => i.id === this.selectedInvoice.id);
    if (invoiceIndex > -1) this.invoices[invoiceIndex] = this.selectedInvoice;

    const newPayment = {
      id: 'PAY-' + Date.now(),
      title: 'Paiement ' + this.selectedInvoice.invoiceNumber,
      serviceTitle: this.selectedInvoice.serviceTitle,
      amount: this.selectedInvoice.amount,
      method: method,
      status: 'PAID',
      date: new Date().toISOString()
    };
    this.payments.unshift(newPayment);

    this.stats.totalSpent += this.selectedInvoice.amount;
    this.stats.pendingInvoices = Math.max(0, this.stats.pendingInvoices - 1);
    this.stats.paidInvoices += 1;

    this.applyFilters();
    this.showPaymentModal = false;
    this.selectedInvoice = null;
  }

  openDetails(payment: any): void {
    this.selectedPayment = payment;
    this.showDetailsModal = true;
  }

  openReceipt(payment: any): void {
    this.selectedPayment = payment;
    this.showReceiptModal = true;
  }

  closeModals(): void {
    this.showInvoiceModal = false;
    this.showPaymentModal = false;
    this.showDetailsModal = false;
    this.showReceiptModal = false;
    this.selectedInvoice = null;
    this.selectedPayment = null;
  }
}
