import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-requests',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.css']
})
export class CompanyRequestsComponent implements OnInit, OnDestroy {
  allRequests: any[] = [];
  filteredRequests: any[] = [];
  
  selectedRequest: any = null;
  showDetailsModal = false;
  showCancelModal = false;
  successMessage = '';

  stats = {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
    confirmed: 0
  };

  searchTerm = '';
  activeStatusFilter = 'ALL';
  activeTypeFilter = 'ALL';
  sortBy = 'NEWEST';

  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private companyService: CompanyService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadRequests(): void {
    this.companyService.getRequests().subscribe({
      next: (requests) => {
        this.allRequests = requests || [];
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des demandes', err);
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      total: this.allRequests.length,
      pending: this.allRequests.filter(r => r.status && r.status.includes('PENDING')).length,
      accepted: this.allRequests.filter(r => r.status && r.status.includes('ACCEPTED')).length,
      rejected: this.allRequests.filter(r => r.status && r.status.includes('REJECTED')).length,
      cancelled: this.allRequests.filter(r => r.status === 'CANCELLED').length,
      confirmed: this.allRequests.filter(r => r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED').length
    };
  }

  applyFilters(): void {
    let result = [...this.allRequests];

    // Status filter
    if (this.activeStatusFilter !== 'ALL') {
      if (this.activeStatusFilter === 'PENDING') result = result.filter(r => r.status && r.status.includes('PENDING'));
      else if (this.activeStatusFilter === 'ACCEPTED') result = result.filter(r => r.status && r.status.includes('ACCEPTED'));
      else if (this.activeStatusFilter === 'REJECTED') result = result.filter(r => r.status && r.status.includes('REJECTED'));
      else if (this.activeStatusFilter === 'CONFIRMED') result = result.filter(r => r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED');
      else result = result.filter(r => r.status === this.activeStatusFilter);
    }

    // Type filter
    if (this.activeTypeFilter !== 'ALL') {
      result = result.filter(r => r.type === this.activeTypeFilter);
    }

    // Search query
    const q = this.searchTerm.toLowerCase().trim();
    if (q) {
      result = result.filter(r => 
        (r.id != null && r.id.toString().includes(q)) ||
        (this.getTypeText(r.type) || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.vehicleName || '').toLowerCase().includes(q) ||
        (r.driverName || '').toLowerCase().includes(q) ||
        (r.ownerName || '').toLowerCase().includes(q) ||
        (this.getStatusText(r.status) || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (this.sortBy) {
      case 'NEWEST':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'OLDEST':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'BUDGET_DESC':
        result.sort((a, b) => (this.getDisplayPrice(b) || 0) - (this.getDisplayPrice(a) || 0));
        break;
      case 'BUDGET_ASC':
        result.sort((a, b) => (this.getDisplayPrice(a) || 0) - (this.getDisplayPrice(b) || 0));
        break;
    }

    this.filteredRequests = result;
  }

  setStatusFilter(status: string): void {
    this.activeStatusFilter = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.searchService.setSearchTerm(this.searchTerm);
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  getTypeText(type: string): string {
    switch(type) {
      case 'VEHICLE_RENTAL': return 'Location véhicules';
      case 'DRIVER_WITH_CAR': return 'Chauffeur avec voiture';
      case 'CUSTOM_REQUEST': return 'Demande personnalisée';
      case 'MIXED_SERVICE': return 'Service mixte';
      default: return type || 'Non précisé';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'PENDING_OWNER': return 'En attente propriétaire';
      case 'PENDING_DRIVER': return 'En attente chauffeur';
      case 'ACCEPTED_OWNER': return 'Acceptée propriétaire';
      case 'REJECTED_OWNER': return 'Refusée propriétaire';
      case 'ACCEPTED_DRIVER': return 'Acceptée chauffeur';
      case 'REJECTED_DRIVER': return 'Refusée chauffeur';
      case 'CANCELLED': return 'Annulée';
      case 'CONFIRMED': return 'Confirmée';
      case 'IN_PROGRESS': return 'En cours';
      case 'COMPLETED': return 'Terminée';
      default: return status || 'Non précisé';
    }
  }

  /** Prix saisi ou estimé (budget, tarif journalier, proposition location). */
  getDisplayPrice(req: any): number | null {
    if (!req) return null;
    const candidates = [
      req.budget,
      req.pricePerDay,
      req.proposedPrice,
      req.finalPrice,
      req.totalPrice
    ];
    for (const value of candidates) {
      if (value != null && value !== '' && !Number.isNaN(Number(value)) && Number(value) > 0) {
        return Number(value);
      }
    }
    return null;
  }

  formatPrice(req: any): string {
    const price = this.getDisplayPrice(req);
    return price != null ? `${price} DT` : 'Non précisé';
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'bg-warning text-dark';
    if (status.includes('ACCEPTED')) return 'bg-success text-white';
    if (status.includes('REJECTED')) return 'bg-danger text-white';
    if (status === 'CONFIRMED' || status === 'COMPLETED') return 'bg-primary text-white';
    if (status === 'CANCELLED') return 'bg-secondary text-white';
    if (status === 'IN_PROGRESS') return 'bg-info text-white';
    return 'bg-warning text-dark';
  }

  openDetails(req: any): void {
    this.selectedRequest = req;
    this.showDetailsModal = true;
  }

  closeModals(): void {
    this.showDetailsModal = false;
    this.showCancelModal = false;
    this.selectedRequest = null;
  }

  confirmCancel(req: any): void {
    this.selectedRequest = req;
    this.showCancelModal = true;
  }

  executeCancel(): void {
    if (!this.selectedRequest) return;
    
    this.companyService.cancelServiceRequest(this.selectedRequest.id).subscribe({
      next: () => {
        this.successMessage = "La demande a été annulée avec succès.";
        this.loadRequests();
        this.closeModals();
        setTimeout(() => this.successMessage = '', 3000);
      }
    });
  }

  contact(req: any): void {
    const queryParams: Record<string, string | number> = { requestId: req.id };

    if (req.type === 'VEHICLE_RENTAL' || req.source === 'RENTAL_CONTRACT' || req.targetRole === 'OWNER') {
      if (req.ownerId) queryParams['ownerId'] = req.ownerId;
      if (req.vehicleId) queryParams['vehicleId'] = req.vehicleId;
      if (req.id) queryParams['bookingId'] = req.id;
      queryParams['context'] = 'COMPANY_OWNER';
    } else if (req.type === 'DRIVER_WITH_CAR' || req.targetRole === 'DRIVER') {
      if (req.driverId) queryParams['driverId'] = req.driverId;
      queryParams['context'] = 'COMPANY_DRIVER';
    } else {
      queryParams['type'] = 'support';
    }

    this.router.navigate(['/company/conversations'], { queryParams });
  }

  confirmReservation(req: any): void {
    this.companyService.confirmReservation(req.id).subscribe({
      next: () => {
        this.successMessage = "Réservation confirmée avec succès !";
        this.loadRequests();
        setTimeout(() => this.successMessage = '', 3000);
      }
    });
  }
}
