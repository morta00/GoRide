import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class CompanyHistoryComponent implements OnInit, OnDestroy {
  historyItems: any[] = [];
  filteredItems: any[] = [];
  
  searchTerm = '';
  typeFilter = 'ALL';
  statusFilter = 'ALL';
  sortBy = 'NEWEST';

  stats = {
    completedServices: 0,
    rejectedCancelled: 0,
    totalSpent: 0,
    reviewsSent: 0
  };

  selectedItem: any = null;
  showModal = false;

  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
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
    this.loadHistory();
  }

  loadHistory(): void {
    this.companyService.getHistory().subscribe({
      next: (history) => {
        this.historyItems = (history || []).map((h: any) => ({
          id: 'HIST-' + h.id,
          relatedEntityId: h.id,
          relatedEntityType: 'REQUEST',
          type: this.mapRequestStatusToType(h.status),
          title: this.mapRequestStatusToTitle(h.status),
          description: h.description || h.comment || `Demande de service ${h.type}`,
          serviceType: this.getTypeText(h.type),
          vehicleName: h.vehicleName || 'Non précisé',
          ownerName: h.ownerName || 'Non précisé',
          driverName: h.driverName || 'Non précisé',
          city: h.city || 'Non précisé',
          amount: h.budget || h.pricePerDay || 0,
          status: h.status === 'COMPLETED' ? 'COMPLETED' : (h.status.includes('REJECTED') ? 'REJECTED' : 'CANCELLED'),
          date: h.createdAt || new Date().toISOString()
        }));
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => {
        console.error('Erreur lors du chargement de l\'historique', err);
      }
    });
  }

  private mapRequestStatusToType(status: string): string {
    if (!status) return 'REQUEST_CANCELLED';
    if (status === 'COMPLETED') return 'SERVICE_COMPLETED';
    if (status.includes('REJECTED')) return 'REQUEST_REJECTED';
    return 'REQUEST_CANCELLED';
  }

  private mapRequestStatusToTitle(status: string): string {
    if (!status) return 'Demande annulée';
    if (status === 'COMPLETED') return 'Service terminé';
    if (status.includes('REJECTED')) return 'Demande refusée';
    return 'Demande annulée';
  }

  private getTypeText(type: string): string {
    switch(type) {
      case 'VEHICLE_RENTAL': return 'Location véhicules';
      case 'DRIVER_WITH_CAR': return 'Chauffeur avec voiture';
      case 'CUSTOM_REQUEST': return 'Demande personnalisée';
      case 'MIXED_SERVICE': return 'Service mixte';
      default: return type || 'Non précisé';
    }
  }

  calculateStats(): void {
    this.stats = {
      completedServices: this.historyItems.filter(i => i.type === 'SERVICE_COMPLETED').length,
      rejectedCancelled: this.historyItems.filter(i => i.type === 'REQUEST_REJECTED' || i.type === 'REQUEST_CANCELLED').length,
      totalSpent: this.historyItems
        .filter(i => i.type === 'PAYMENT' || i.type === 'INVOICE_PAID' || i.type === 'SERVICE_COMPLETED')
        .reduce((acc, curr) => acc + (curr.amount || 0), 0),
      reviewsSent: this.historyItems.filter(i => i.type === 'REVIEW_SENT').length
    };
  }

  applyFilters(): void {
    let items = [...this.historyItems];

    // Search
    const q = this.searchTerm.toLowerCase().trim();
    if (q) {
      items = items.filter(i => 
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.serviceType || '').toLowerCase().includes(q) ||
        (i.vehicleName || '').toLowerCase().includes(q) ||
        (i.ownerName || '').toLowerCase().includes(q) ||
        (i.driverName || '').toLowerCase().includes(q) ||
        (i.city || '').toLowerCase().includes(q) ||
        (i.invoiceNumber || '').toLowerCase().includes(q) ||
        (this.getStatusLabel(i.status) || '').toLowerCase().includes(q) ||
        (i.amount || '').toString().includes(q)
      );
    }

    // Type Filter
    if (this.typeFilter !== 'ALL') {
      items = items.filter(i => {
        if (this.typeFilter === 'SERVICES') return i.type === 'SERVICE_COMPLETED';
        if (this.typeFilter === 'REJECTED') return i.type === 'REQUEST_REJECTED';
        if (this.typeFilter === 'CANCELLED') return i.type === 'REQUEST_CANCELLED';
        if (this.typeFilter === 'PAYMENTS') return i.type === 'PAYMENT';
        if (this.typeFilter === 'INVOICES') return i.type === 'INVOICE_PAID';
        if (this.typeFilter === 'REVIEWS') return i.type === 'REVIEW_SENT';
        return true;
      });
    }

    // Status Filter
    if (this.statusFilter !== 'ALL') {
      items = items.filter(i => i.status === this.statusFilter);
    }

    // Sort
    items.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const amountA = a.amount || 0;
      const amountB = b.amount || 0;

      if (this.sortBy === 'NEWEST') return dateB - dateA;
      if (this.sortBy === 'OLDEST') return dateA - dateB;
      if (this.sortBy === 'AMOUNT_DESC') return amountB - amountA;
      if (this.sortBy === 'AMOUNT_ASC') return amountA - amountB;
      return 0;
    });

    this.filteredItems = items;
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'COMPLETED': return 'Terminé';
      case 'REJECTED': return 'Refusé';
      case 'CANCELLED': return 'Annulé';
      case 'PAID': return 'Payé';
      case 'REFUNDED': return 'Remboursé';
      case 'SENT': return 'Envoyé';
      default: return status || 'N/A';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'COMPLETED': return 'bg-success-light text-success';
      case 'REJECTED': return 'bg-danger-light text-danger';
      case 'CANCELLED': return 'bg-secondary-light text-secondary';
      case 'PAID': return 'bg-primary-light text-primary';
      case 'REFUNDED': return 'bg-warning-light text-warning';
      case 'SENT': return 'bg-info-light text-info';
      default: return 'bg-light text-dark';
    }
  }

  getTypeIcon(type: string): string {
    switch(type) {
      case 'SERVICE_COMPLETED': return 'ion-md-checkmark-circle';
      case 'REQUEST_CANCELLED': return 'ion-md-close-circle';
      case 'REQUEST_REJECTED': return 'ion-md-alert';
      case 'PAYMENT': return 'ion-md-wallet';
      case 'REFUND': return 'ion-md-refresh';
      case 'INVOICE_PAID': return 'ion-md-paper';
      case 'REVIEW_SENT': return 'ion-md-star';
      default: return 'ion-md-list';
    }
  }

  getTypeClass(type: string): string {
    switch(type) {
      case 'SERVICE_COMPLETED': return 'icon-success';
      case 'REQUEST_CANCELLED': return 'icon-secondary';
      case 'REQUEST_REJECTED': return 'icon-danger';
      case 'PAYMENT': return 'icon-primary';
      case 'REFUND': return 'icon-warning';
      case 'INVOICE_PAID': return 'icon-indigo';
      case 'REVIEW_SENT': return 'icon-info';
      default: return 'icon-light';
    }
  }

  openDetails(item: any): void {
    this.selectedItem = item;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedItem = null;
  }

  viewInvoice(): void {
    this.router.navigate(['/company/payments']);
    this.closeModal();
  }

  viewPayment(): void {
    this.router.navigate(['/company/payments']);
    this.closeModal();
  }

  viewReview(): void {
    this.router.navigate(['/company/reviews']);
    this.closeModal();
  }

  requestAgain(): void {
    this.router.navigate(['/company/request-service']);
    this.closeModal();
  }
}
