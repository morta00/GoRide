import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { DriverRequestService, DriverRequest } from '../../services/driver-request.service';
import { ProfileAvatarComponent } from '../../../header/profile-avatar/profile-avatar.component';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileAvatarComponent],
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.css']
})
export class RequestsComponent implements OnInit, OnDestroy {
  allRequests: DriverRequest[] = [];
  filteredRequests: DriverRequest[] = [];
  companyRequests: any[] = [];
  isLoading = true;
  
  // States
  showDetailsModal = false;
  showAcceptModal = false;
  showRejectModal = false;
  selectedRequest: DriverRequest | null = null;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  inboxHint: string | null = null;
  
  // Filters
  activeFilter = 'ALL';
  /** ALL | COVOITURAGE | INDIVIDUAL */
  typeFilter: 'ALL' | 'COVOITURAGE' | 'INDIVIDUAL' = 'ALL';
  searchTerm = '';
  sortBy = 'NEWEST';
  
  // Stats
  stats = {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0
  };

  constructor(
    private requestService: DriverRequestService,
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  private refreshInterval: any;
  private searchSub?: Subscription;
  private pendingOpenRequestId: string | null = null;
  private pendingOpenDetails = false;

  ngOnInit(): void {
    this.loadRequests();
    this.loadCompanyRequests();
    this.refreshInterval = setInterval(() => this.loadRequests(), 5000);

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url.includes('/driver/requests')) {
        this.loadRequests();
      }
    });

    // Handle query params (e.g. from dashboard)
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
        this.searchService.setSearchTerm(this.searchTerm);
        this.applyFilters();
      } else if (params['bookingId'] || params['tripId'] || params['requestId']) {
        this.pendingOpenRequestId = String(
          params['bookingId'] || params['requestId'] || params['tripId']
        );
        this.pendingOpenDetails = params['openDetails'] === '1' || params['openDetails'] === true;
        this.activeFilter = 'ALL';
        this.searchTerm = '';
        this.applyFilters();
        this.tryOpenPendingRequest();
      }
    });

    this.searchSub = this.searchService.searchTerm$.subscribe(term => {
      if (term !== this.searchTerm) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
  }

  loadCompanyRequests(): void {
    try {
      this.companyRequests = JSON.parse(localStorage.getItem('goride_driver_company_requests') || '[]');
    } catch (e) {
      console.error('Error parsing company requests', e);
      this.companyRequests = [];
    }
  }

  respondCompanyRequest(id: string, status: string): void {
    if (status === 'REJECTED_DRIVER' && !confirm('Voulez-vous vraiment refuser cette demande d\'entreprise ?')) return;

    // update in driver reqs
    const index = this.companyRequests.findIndex(r => r.id === id);
    if (index > -1) {
      this.companyRequests[index].status = status;
      localStorage.setItem('goride_driver_company_requests', JSON.stringify(this.companyRequests));
      
      // update in company reqs
      let companyReqs = [];
      try {
        companyReqs = JSON.parse(localStorage.getItem('company_service_requests') || '[]');
      } catch (e) {
        console.error('Error parsing company service requests', e);
      }
      const cIndex = companyReqs.findIndex((r: any) => r.id === id);
      if (cIndex > -1) {
        companyReqs[cIndex].status = status;
        localStorage.setItem('company_service_requests', JSON.stringify(companyReqs));
      }
      this.successMessage = "Réponse envoyée à l'entreprise.";
      setTimeout(() => this.successMessage = null, 3000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.searchSub?.unsubscribe();
  }

  loadRequests(): void {
    if (this.allRequests.length === 0) this.isLoading = true;
    this.requestService.getRequests().subscribe({
      next: (data) => {
        console.log('Driver requests response:', data);
        this.allRequests = data;
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
        this.errorMessage = null;
        this.inboxHint = this.requestService.lastSharedInboxError;
        const sharedCount = data.filter(r => this.isSharedBooking(r)).length;
        if (sharedCount === 0 && !this.inboxHint && !this.errorMessage) {
          this.inboxHint =
            'Aucune demande covoiturage pour vos trajets. Vérifiez que vous êtes connecté en chauffeur (driver@goride.demo) après une réservation client.';
        } else if (sharedCount > 0) {
          this.inboxHint = null;
        }
        this.tryOpenPendingRequest();
      },
      error: (err) => {
        console.error('Driver requests error:', err);
        this.isLoading = false;
        this.errorMessage = "Impossible de charger les demandes reçues. Vérifiez votre connexion ou les droits d'accès.";
      }
    });
  }

  private tryOpenPendingRequest(): void {
    if (!this.pendingOpenRequestId || this.isLoading) return;
    const id = this.pendingOpenRequestId;
    const req = this.allRequests.find(r => this.matchesRequestId(r, id));
    if (req) {
      if (req.status === 'PENDING' || this.pendingOpenDetails) {
        this.openDetails(req);
      }
      this.pendingOpenRequestId = null;
      this.pendingOpenDetails = false;
      return;
    }
    if (this.allRequests.length === 0) return;
    this.pendingOpenRequestId = null;
    this.pendingOpenDetails = false;
  }

  private matchesRequestId(r: DriverRequest, id: string): boolean {
    if (String(r.id) === id) return true;
    if (r.bookingId != null && String(r.bookingId) === id) return true;
    if (r.tripId != null && String(r.tripId) === id) return true;
    if (String(r.id) === `booking-${id}`) return true;
    return false;
  }

  calculateStats(): void {
    this.stats = {
      total: this.allRequests.length,
      pending: this.allRequests.filter(r => r.status === 'PENDING').length,
      accepted: this.allRequests.filter(r => r.status === 'ACCEPTED').length,
      rejected: this.allRequests.filter(r => r.status === 'REJECTED').length,
      cancelled: this.allRequests.filter(r => r.status === 'CANCELLED').length
    };
  }

  applyFilters(): void {
    let result = [...this.allRequests];

    // Status Filter
    if (this.activeFilter !== 'ALL') {
      result = result.filter(r => r.status === this.activeFilter);
    }

    if (this.typeFilter === 'COVOITURAGE') {
      result = result.filter(r => this.isSharedBooking(r));
    } else if (this.typeFilter === 'INDIVIDUAL') {
      result = result.filter(r => !this.isSharedBooking(r));
    }

    // Search Query
    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(r => 
        (r.clientName || '').toLowerCase().includes(q) ||
        (r.from || '').toLowerCase().includes(q) ||
        (r.to || '').toLowerCase().includes(q) ||
        (r.vehicleType || '').toLowerCase().includes(q) ||
        (this.getRequestTypeLabel(r)).toLowerCase().includes(q) ||
        (this.getStatusLabel(r.status)).toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (this.sortBy) {
      case 'NEWEST':
        result.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        break;
      case 'OLDEST':
        result.sort((a, b) => new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime());
        break;
      case 'PRICE_DESC':
        result.sort((a, b) => b.estimatedAmount - a.estimatedAmount);
        break;
      case 'PRICE_ASC':
        result.sort((a, b) => a.estimatedAmount - b.estimatedAmount);
        break;
      case 'DIST_DESC':
        result.sort((a, b) => this.parseDistance(b.distance) - this.parseDistance(a.distance));
        break;
      case 'DIST_ASC':
        result.sort((a, b) => this.parseDistance(a.distance) - this.parseDistance(b.distance));
        break;
    }

    this.filteredRequests = result;
  }

  private parseDistance(dist: string): number {
    return parseFloat(dist.replace(/[^0-9.]/g, '')) || 0;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  setTypeFilter(filter: 'ALL' | 'COVOITURAGE' | 'INDIVIDUAL'): void {
    this.typeFilter = filter;
    this.applyFilters();
  }

  countByType(kind: 'COVOITURAGE' | 'INDIVIDUAL'): number {
    return this.allRequests.filter(r =>
      kind === 'COVOITURAGE' ? this.isSharedBooking(r) : !this.isSharedBooking(r)
    ).length;
  }

  getRequestTypeLabel(req: DriverRequest): string {
    return this.isSharedBooking(req) ? 'Covoiturage' : 'Trajet individuel';
  }

  getRequestTypeClass(req: DriverRequest): string {
    return this.isSharedBooking(req) ? 'request-type-badge--covoiturage' : 'request-type-badge--individual';
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  // --- Actions ---

  openDetails(req: DriverRequest): void {
    this.selectedRequest = req;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedRequest = null;
  }

  openAcceptModal(req: DriverRequest): void {
    this.selectedRequest = req;
    this.showAcceptModal = true;
  }

  closeAcceptModal(): void {
    this.showAcceptModal = false;
    this.selectedRequest = null;
  }

  confirmAccept(): void {
    if (!this.selectedRequest) return;

    const accepted = this.selectedRequest;
    const onSuccess = () => {
      this.successMessage = "Demande acceptée. Le passager peut voyager avec vous.";
      this.loadRequests();
      this.closeAcceptModal();
      setTimeout(() => this.successMessage = null, 3000);
      if (accepted.clientId) {
        this.router.navigate(['/driver/conversations'], {
          queryParams: {
            clientId: accepted.clientId,
            rideId: accepted.bookingId ?? accepted.tripId ?? accepted.id,
            requestId: accepted.bookingId ?? accepted.id
          }
        });
      }
    };

    if (accepted.kind === 'SHARED_BOOKING' && accepted.bookingId != null) {
      this.requestService.acceptSharedBooking(accepted.bookingId).subscribe({
        next: onSuccess,
        error: (err) => {
          console.error('Accept shared booking failed', err);
          alert(err?.error?.message || 'Impossible d\'accepter cette demande.');
        }
      });
      return;
    }

    this.requestService.updateStatus(accepted.id, 'ACCEPTED').subscribe({
      next: onSuccess,
      error: (err) => {
        console.error('Accept ride request failed', err);
        alert(err?.error?.message || 'Impossible d\'accepter cette demande.');
      }
    });
  }

  openRejectModal(req: DriverRequest): void {
    this.selectedRequest = req;
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
  }

  confirmReject(): void {
    if (!this.selectedRequest) return;

    const rejected = this.selectedRequest;
    const onSuccess = () => {
      this.successMessage = 'Demande refusée.';
      this.loadRequests();
      this.closeRejectModal();
      setTimeout(() => this.successMessage = null, 3000);
    };

    if (rejected.kind === 'SHARED_BOOKING' && rejected.bookingId != null) {
      this.requestService.rejectSharedBooking(rejected.bookingId).subscribe({
        next: onSuccess,
        error: (err) => {
          console.error('Reject shared booking failed', err);
          alert(err?.error?.message || 'Impossible de refuser cette demande.');
        }
      });
      return;
    }

    this.requestService.updateStatus(rejected.id, 'REJECTED').subscribe({
      next: onSuccess,
      error: (err) => {
        console.error('Reject ride request failed', err);
        alert(err?.error?.message || 'Impossible de refuser cette demande.');
      }
    });
  }

  goToChat(req: DriverRequest): void {
    if (!req.clientId) {
      alert('Impossible d\'ouvrir la conversation : client introuvable.');
      return;
    }
    this.router.navigate(['/driver/conversations'], {
      queryParams: {
        requestId: req.bookingId ?? req.id,
        clientId: req.clientId,
        rideId: req.tripId ?? req.bookingId ?? req.id
      }
    });
  }

  goToTrips(req: DriverRequest): void {
    const tripId = req.tripId ?? req.id;
    this.router.navigate(['/driver/trips'], {
      queryParams: { tripId, openDetails: '1' }
    });
  }

  isSharedBooking(req: DriverRequest): boolean {
    return req.kind === 'SHARED_BOOKING';
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'PENDING': 'En attente',
      'ACCEPTED': 'Acceptée',
      'REJECTED': 'Refusée',
      'CANCELLED': 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'PENDING': 'status-pending',
      'ACCEPTED': 'status-accepted',
      'REJECTED': 'status-rejected',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || '';
  }
}
