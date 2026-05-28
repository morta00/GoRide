import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { RentalService } from '../../../services/rental.service';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { AuthService } from '../../../auth/auth.service';
import { RentalContract, RentalStatus, VehicleStatus } from '../../../models/rental.model';
import { MessagingService } from '../../../services/messaging.service';
import { FleetReservationsCalendarComponent } from './fleet-reservations-calendar/fleet-reservations-calendar.component';

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, FleetReservationsCalendarComponent],
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.css']
})
export class RequestsComponent implements OnInit, OnDestroy {
  requests: RentalContract[] = [];
  isLoading = true;
  processingId: number | null = null;
  private _selectedStatus: string = 'ALL';
  private _searchTerm: string = '';
  viewingRequest: RentalContract | null = null;
  companyRequests: any[] = [];
  viewMode: 'list' | 'calendar' = 'list'; // View toggle state

  get selectedStatus(): string { return this._selectedStatus; }
  set selectedStatus(value: string) {
    this._selectedStatus = value;
    this.currentPage = 1;
  }

  get searchTerm(): string { return this._searchTerm; }
  set searchTerm(value: string) {
    this._searchTerm = value;
    this.currentPage = 1;
  }
  notifications: any[] = [];
  currentUser: any = null;

  // --- Pagination State ---
  currentPage: number = 1;
  itemsPerPage: number = 3;

  get totalPages(): number {
    return Math.ceil(this.totalFilteredItems / this.itemsPerPage);
  }

  get totalFilteredItems(): number {
    return this.filteredRequests.length;
  }

  get paginatedRequests(): RentalContract[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRequests.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get showingStart(): number {
    return this.totalFilteredItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get showingEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalFilteredItems);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  private searchSub?: Subscription;

  constructor(
    private rentalService: RentalService, 
    private vehicleService: VehicleService,
    private authService: AuthService,
    private router: Router,
    private messagingService: MessagingService,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  showNotification(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    const id = Date.now();
    this.notifications.push({ id, message, type });
    setTimeout(() => {
      this.removeNotification(id);
    }, 5000);
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  goToVehicles(): void {
    this.router.navigate(['/fleet/my-vehicles']);
  }

  openDetails(req: RentalContract): void {
    this.viewingRequest = req;
    document.body.style.overflow = 'hidden'; // Prevent scroll
  }

  closeDetails(): void {
    this.viewingRequest = null;
    document.body.style.overflow = 'auto';
  }

  get filteredRequests(): RentalContract[] {
    let filtered = this.requests || [];

    // Filter by status
    if (this.selectedStatus !== 'ALL') {
      filtered = filtered.filter(r => r.status.toUpperCase() === this.selectedStatus.toUpperCase());
    }

    // Filter by search term
    const term = this.searchTerm?.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(r => 
        r.renter?.firstName?.toLowerCase().includes(term) ||
        r.renter?.lastName?.toLowerCase().includes(term) ||
        r.vehicle?.brand?.toLowerCase().includes(term) ||
        r.vehicle?.model?.toLowerCase().includes(term) ||
        r.vehicle?.location?.toLowerCase().includes(term) ||
        r.startDate?.includes(term) ||
        r.endDate?.includes(term)
      );
    }

    return filtered;
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
  }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this._searchTerm !== term) {
        this._searchTerm = term;
        this.currentPage = 1;
      }
    });
    this.currentUser = this.authService.getCurrentUser();
    this.loadRequests();
    this.loadCompanyRequests();
  }

  loadCompanyRequests(): void {
    this.rentalService.getOwnerCompanyServiceRequests().subscribe({
      next: (data) => {
        this.companyRequests = (data || []).filter(
          (r: any) => r.status === 'PENDING' || (r.status && String(r.status).includes('PENDING'))
        );
      },
      error: () => {
        this.companyRequests = [];
      }
    });
  }

  respondCompanyRequest(id: string | number, status: string): void {
    if (status === 'REJECTED_OWNER' && !confirm('Voulez-vous vraiment refuser cette demande d\'entreprise ?')) return;

    this.rentalService.respondOwnerCompanyRequest(id, status).subscribe({
      next: () => {
        this.showNotification('Réponse envoyée à l\'entreprise.', 'success');
        this.loadCompanyRequests();
        this.loadRequests();
      },
      error: (err) => {
        this.showNotification(err.error?.message || 'Erreur lors de la réponse.', 'warning');
      }
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    
    // First, fetch the owner's fleet to ensure we can link requests correctly
    this.vehicleService.getMyFleet().subscribe({
      next: (myVehicles: Vehicle[]) => {
        const fleet = Array.isArray(myVehicles) ? myVehicles : [];
        
        // Then, fetch the reservations
        this.rentalService.getOwnerReservations().subscribe({
          next: (data: RentalContract[]) => {
            // Strictly filter by owner ID as a frontend safety measure
            if (this.currentUser && data) {
              this.requests = data.filter(r => r.owner?.id === this.currentUser.id || !r.owner?.id);
            } else {
              this.requests = data || [];
            }
            
            if (!this.requests) {
              this.requests = [];
            }
            
            this.isLoading = false;
            
            // Notification if new requests exist
            const pending = this.getCountByStatus('PENDING');
            if (pending > 0) {
              setTimeout(() => {
                this.showNotification(`Vous avez ${pending} nouvelle(s) demande(s) en attente.`, 'info');
              }, 1000);
            }
          },
          error: (err: any) => {
            console.error('Erreur de chargement des requêtes', err);
            this.isLoading = false;
          }
        });
      },
      error: (err: any) => {
        console.error('Erreur de chargement de la flotte', err);
        this.isLoading = false;
      }
    });
  }

  getCountByStatus(status: string): number {
    return this.requests.filter(r => r.status === status).length;
  }

  getTotalRevenue(): number {
    return this.requests
      .filter(r => r.status === 'ACCEPTED' || r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (r.finalPrice || r.proposedPrice || 0), 0);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'En attente',
      'ACCEPTED': 'Confirmé',
      'REJECTED': 'Refusé',
      'CANCELLED': 'Annulé',
      'COMPLETED': 'Terminé'
    };
    return labels[status.toUpperCase()] || status;
  }

  contactClient(req: RentalContract): void {
    const renterId = req.renter?.id ?? (req as any).renterId;
    const vehicleId = req.vehicle?.id ?? (req as any).vehicleId;
    const bookingId = req.id;

    if (!renterId) {
      alert('Identifiant du client non disponible.');
      return;
    }

    this.messagingService.startConversation({
      participantId: Number(renterId),
      context: 'RENTAL',
      vehicleId: vehicleId != null ? Number(vehicleId) : undefined,
      bookingId: bookingId != null ? Number(bookingId) : undefined
    }).subscribe({
      next: (conv: { id: number }) => {
        this.router.navigate(['/fleet/messages'], {
          queryParams: { convId: conv.id }
        });
      },
      error: (err: unknown) => {
        console.error('Erreur lors de la création de la conversation', err);
        alert(this.messagingService.toApiError(err).message);
      }
    });
  }

  respond(id: number | undefined, status: string, currentPrice: number): void {
    if (!id) return;
    
    let newPrice = currentPrice;
    if (status === RentalStatus.REJECTED) {
      if (!confirm('Voulez-vous vraiment refuser cette demande ?')) return;
    }

    if (status === RentalStatus.ACCEPTED) {
      const p = prompt('Confirmez le prix final (TND) :', currentPrice.toString());
      if (p === null) return; // annulé
      newPrice = parseFloat(p) || currentPrice;
    }

    this.processingId = id;
    this.rentalService.respondToReservation(id, status, newPrice).subscribe({
      next: (updated: RentalContract) => {
        const index = this.requests.findIndex(r => r.id === id);
        if (index > -1) {
          this.requests[index] = updated;
        }
        this.processingId = null;
        this.showNotification('Réponse enregistrée avec succès.', 'success');
      },
      error: (err: any) => {
        alert('Erreur lors de la réponse');
        console.error(err);
        this.processingId = null;
      }
    });
  }
}
