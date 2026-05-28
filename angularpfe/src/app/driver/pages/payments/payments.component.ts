import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DriverPaymentService, DriverTransaction, DriverPaymentSummary } from '../../services/driver-payment.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent implements OnInit, OnDestroy {
  summary: DriverPaymentSummary = {
    availableBalance: 0,
    pendingEarnings: 0,
    totalWithdrawn: 0,
    nextPayout: ''
  };
  
  transactions: DriverTransaction[] = [];
  filteredTransactions: DriverTransaction[] = [];
  
  payoutMethod: any = null;
  
  // Filters
  searchTerm: string = '';
  typeFilter: string = 'ALL';
  statusFilter: string = 'ALL';
  sortOrder: 'newest' | 'oldest' | 'amount-high' | 'amount-low' = 'newest';

  // Modals
  showWithdrawModal = false;
  showDetailsModal = false;
  showReceiptModal = false;
  selectedTransaction: DriverTransaction | null = null;
  
  withdrawForm: FormGroup;
  isSubmitting = false;
  private searchSub?: Subscription;

  constructor(
    private paymentService: DriverPaymentService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {
    this.withdrawForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      method: ['', Validators.required],
      note: ['']
    });
  }

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
    this.paymentService.summary$.subscribe(s => this.summary = s);
    this.paymentService.transactions$.subscribe(t => {
      this.transactions = t;
      this.applyFilters();
    });
    this.payoutMethod = this.paymentService.getPaymentPreference();
    
    // Set default method in form
    if (this.payoutMethod) {
      this.withdrawForm.patchValue({ method: this.payoutMethod.typeLabel || 'Virement bancaire' });
    }
  }

  applyFilters(): void {
    let result = [...this.transactions];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t => 
        t.reference.toLowerCase().includes(term) || 
        t.method.toLowerCase().includes(term) ||
        (t.note && t.note.toLowerCase().includes(term))
      );
    }

    if (this.typeFilter !== 'ALL') {
      result = result.filter(t => t.type === this.typeFilter);
    }

    if (this.statusFilter !== 'ALL') {
      result = result.filter(t => t.status === this.statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (this.sortOrder) {
        case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-high': return b.amount - a.amount;
        case 'amount-low': return a.amount - b.amount;
        default: return 0;
      }
    });

    this.filteredTransactions = result;
  }

  openWithdrawModal(): void {
    this.withdrawForm.reset({
      amount: null,
      method: this.payoutMethod?.typeLabel || 'Virement bancaire',
      note: ''
    });
    this.withdrawForm.get('amount')?.setValidators([
      Validators.required, 
      Validators.min(1), 
      Validators.max(this.summary.availableBalance)
    ]);
    this.showWithdrawModal = true;
  }

  confirmWithdrawal(): void {
    if (this.withdrawForm.valid) {
      this.isSubmitting = true;
      const { amount, method, note } = this.withdrawForm.value;
      
      this.paymentService.requestWithdrawal(amount, method, note).subscribe({
        next: (tx) => {
          this.isSubmitting = false;
          this.showWithdrawModal = false;
          // Trigger success animation/toast if needed
          alert('Demande de retrait envoyée avec succès !');
        }
      });
    }
  }

  viewDetails(tx: DriverTransaction): void {
    this.selectedTransaction = tx;
    this.showDetailsModal = true;
  }

  viewReceipt(tx: DriverTransaction): void {
    this.selectedTransaction = tx;
    this.showReceiptModal = true;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PAID': return 'Payé';
      case 'PENDING': return 'En attente';
      case 'FAILED': return 'Échoué';
      case 'CANCELLED': return 'Annulé';
      default: return status;
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'VERSEMEMENT_RECU': return 'Versement reçu';
      case 'RETRAIT_DEMANDE': return 'Retrait demandé';
      case 'BONUS': return 'Bonus';
      case 'AJUSTEMENT': return 'Ajustement';
      default: return type;
    }
  }

  downloadReceipt(): void {
    alert('Téléchargement du PDF du reçu...');
  }
}
