import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { DriverHistoryService } from '../../services/driver-history.service';
import { DriverGivenReviewService } from '../../services/driver-given-review.service';
import { HistoryItem, HistorySummary } from '../../models/driver.models';

@Component({
  selector: 'app-driver-history',
  templateUrl: './driver-history.component.html',
  styleUrls: ['./driver-history.component.css']
})
export class DriverHistoryComponent implements OnInit, OnDestroy {
  history: HistoryItem[] = [];
  filteredHistory: HistoryItem[] = [];
  summary: HistorySummary = {
    completedTrips: 0,
    cancelledTrips: 0,
    totalEarnings: 0,
    totalReviews: 0
  };

  searchTerm: string = '';
  typeFilter: string = 'ALL';
  statusFilter: string = 'ALL';
  sortOrder: 'recent' | 'older' | 'amount_asc' | 'amount_desc' = 'recent';

  showModal = false;
  selectedItem: HistoryItem | null = null;

  private searchSub?: Subscription;

  constructor(
    private historyService: DriverHistoryService,
    private reviewService: DriverGivenReviewService,
    private router: Router,
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
    this.historyService.getHistory().subscribe(h => {
      this.history = h;
      this.applyFilters();
    });

    this.historyService.getSummary().subscribe(s => {
      this.summary = s;
    });
  }

  applyFilters(): void {
    let result = [...this.history];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(h => 
        h.title.toLowerCase().includes(term) || 
        h.description.toLowerCase().includes(term) ||
        h.type.toLowerCase().includes(term) ||
        h.status.toLowerCase().includes(term) ||
        (h.amount && h.amount.toString().includes(term))
      );
    }

    if (this.typeFilter !== 'ALL') {
      result = result.filter(h => {
        switch (this.typeFilter) {
          case 'TRIPS': return h.type === 'TRIP_COMPLETED' || h.type === 'TRIP_CANCELLED';
          case 'REQUESTS': return h.type === 'REQUEST_ACCEPTED' || h.type === 'REQUEST_REJECTED';
          case 'EARNINGS': return h.type === 'EARNING_CREATED';
          case 'PAYMENTS': return h.type === 'PAYMENT_RECEIVED' || h.type === 'WITHDRAWAL_REQUESTED';
          case 'VEHICLES': return h.type === 'VEHICLE_RENTED' || h.type === 'VEHICLE_RENTAL_COMPLETED';
          case 'REVIEWS': return h.type === 'REVIEW_RECEIVED';
          default: return true;
        }
      });
    }

    if (this.statusFilter !== 'ALL') {
      result = result.filter(h => h.status === this.statusFilter);
    }

    result.sort((a, b) => {
      if (this.sortOrder === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (this.sortOrder === 'older') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (this.sortOrder === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
      if (this.sortOrder === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

    this.filteredHistory = result;
  }

  openDetails(item: HistoryItem): void {
    this.selectedItem = item;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedItem = null;
  }

  goToRelated(item: HistoryItem): void {
    this.closeModal();
    switch (item.type) {
      case 'TRIP_COMPLETED':
      case 'TRIP_CANCELLED':
        this.router.navigate(['/driver/trips']);
        break;
      case 'REQUEST_ACCEPTED':
      case 'REQUEST_REJECTED':
        this.router.navigate(['/driver/requests']);
        break;
      case 'EARNING_CREATED':
        this.router.navigate(['/driver/earnings']);
        break;
      case 'PAYMENT_RECEIVED':
      case 'WITHDRAWAL_REQUESTED':
        this.router.navigate(['/driver/payments']);
        break;
      case 'VEHICLE_RENTED':
      case 'VEHICLE_RENTAL_COMPLETED':
        this.router.navigate(['/driver/my-vehicle']);
        break;
      case 'REVIEW_RECEIVED':
        this.router.navigate(['/driver/reviews']);
        break;
    }
  }

  hasRentalReview(item: HistoryItem): boolean {
    if (item.type === 'VEHICLE_RENTAL_COMPLETED' || (item.type === 'VEHICLE_RENTED' && item.status === 'COMPLETED')) {
      // For simplicity, we use the title or relatedId if available
      // In a real app we'd have a rentalId in the HistoryItem
      return this.reviewService.hasReviewForRental('RENT-DRV-001'); // Using mock ID for demo
    }
    return false;
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'COMPLETED': 'Terminé',
      'CANCELLED': 'Annulé',
      'ACCEPTED': 'Accepté',
      'REJECTED': 'Refusé',
      'PAID': 'Payé',
      'PENDING': 'En attente',
      'ACTIVE': 'Actif'
    };
    return labels[status] || status;
  }

  getTypeLabel(type: string): string {
    const labels: any = {
      'TRIP_COMPLETED': 'Trajet terminé',
      'TRIP_CANCELLED': 'Trajet annulé',
      'REQUEST_ACCEPTED': 'Demande acceptée',
      'REQUEST_REJECTED': 'Demande refusée',
      'EARNING_CREATED': 'Revenu généré',
      'PAYMENT_RECEIVED': 'Paiement reçu',
      'WITHDRAWAL_REQUESTED': 'Retrait demandé',
      'VEHICLE_RENTED': 'Véhicule loué',
      'VEHICLE_RENTAL_COMPLETED': 'Location terminée',
      'REVIEW_RECEIVED': 'Avis reçu'
    };
    return labels[type] || type;
  }
}
