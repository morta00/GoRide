import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { RideRequestService } from '../../../services/ride-request.service';
import { RoleService } from '../../../auth/role.service';
import { ReservationService } from '../../../services/reservation.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

interface HistoryItem {
  id: string;
  type: 'RIDE_COMPLETED' | 'RIDE_CANCELLED' | 'RIDE_REJECTED' | 'SHARED_RIDE_COMPLETED' | 'PAYMENT' | 'REFUND' | 'REVIEW_SENT';
  title: string;
  description: string;
  date: string;
  status: string;
  amount: number;
  relatedEntityId: string;
  relatedEntityType: string;
  route?: { from: string, to: string };
  driverName?: string;
  vehicleName?: string;
  paymentMethod?: string;
  metadata?: any;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit, OnDestroy {
  
  historyItems: HistoryItem[] = [];
  filteredHistory: HistoryItem[] = [];
  isLoading: boolean = false;
  successMessage: string = '';
  isTenantMode = false;
  
  // Status Mapping (French)
  private readonly STATUS_MAP: { [key: string]: string } = {
    'PENDING': 'En attente',
    'ACCEPTED': 'Acceptée',
    'CONFIRMED': 'Confirmée',
    'DRIVER_ARRIVING': 'Chauffeur en route',
    'IN_PROGRESS': 'En cours',
    'COMPLETED': 'Terminée',
    'CANCELLED': 'Annulée',
    'REJECTED': 'Refusée',
    'PAID': 'Payé',
    'REFUNDED': 'Remboursé',
    'SENT': 'Envoyé'
  };

  // Stats
  stats = {
    completed: 0,
    cancelled: 0,
    spent: 0,
    reviews: 0
  };

  // Filters
  searchTerm: string = '';
  selectedType: string = 'Tous';
  selectedStatus: string = 'Tous';
  sortBy: string = 'recent';

  // Details Modal
  selectedItem: HistoryItem | null = null;
  showDetailsModal: boolean = false;

  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private rideRequestService: RideRequestService,
    private roleService: RoleService,
    private reservationService: ReservationService,
    private searchService: SearchService
  ) { }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });

    this.roleService.activeRole$.subscribe(role => {
      this.isTenantMode = role === 'ROLE_CLIENT';
      this.selectedType = 'Tous';
      this.selectedStatus = 'Tous';
      this.searchTerm = '';
      this.loadHistory();
    });
    
    window.addEventListener('rideRequestCreated', () => {
      if (!this.isTenantMode) this.loadHistory();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  loadHistory(): void {
    this.isLoading = true;
    const user = this.authService.getCurrentUser();
    const userId = user?.id;

    if (!userId) {
      this.isLoading = false;
      return;
    }

    if (this.isTenantMode) {
      this.reservationService.getClientRentals().subscribe({
        next: (rentals) => {
          const all: HistoryItem[] = [];
          (rentals || []).forEach((r: any) => {
            if (r.status === 'COMPLETED' || r.status === 'CANCELLED' || r.status === 'REJECTED') {
              all.push(this.normalizeRental(r));
            }
          });
          this.historyItems = all;
          this.calculateStats();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading vehicle rentals history', err);
          this.isLoading = false;
        }
      });
    } else {
      this.rideRequestService.getMyRideRequests().subscribe({
        next: (backendRequests) => {
          const all: HistoryItem[] = [];
          (backendRequests || []).forEach((r: any) => {
            all.push(this.normalizeRide(r, 'REQUEST'));
          });
          
          const uniqueMap = new Map();
          all.forEach(item => {
            const key = `${item.type}-${item.relatedEntityId || item.id}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, item);
            }
          });

          this.historyItems = Array.from(uniqueMap.values());
          this.calculateStats();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading history', err);
          this.isLoading = false;
        }
      });
    }
  }

  private normalizeRental(r: any): HistoryItem {
    const status = r.status || 'COMPLETED';
    let type: any = 'RIDE_COMPLETED';
    if (status === 'CANCELLED') type = 'RIDE_CANCELLED';
    if (status === 'REJECTED') type = 'RIDE_REJECTED';
    
    const brand = r.vehicle?.brand || 'Véhicule';
    const model = r.vehicle?.model || 'GoRide';
    const ownerName = r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : 'Propriétaire GoRide';

    return {
      id: 'REN-' + r.id,
      type: type,
      title: status === 'COMPLETED' ? 'Location terminée' : (status === 'CANCELLED' ? 'Location annulée' : 'Location refusée'),
      description: `Location ${brand} ${model} chez ${ownerName}`,
      date: r.startDate || r.createdAt || new Date().toISOString(),
      status: status,
      amount: r.totalPrice || 0,
      relatedEntityId: r.id,
      relatedEntityType: 'RENTAL',
      route: { from: r.pickupLocation || 'Départ', to: r.returnLocation || 'Retour' },
      driverName: ownerName,
      vehicleName: `${brand} ${model}`,
      paymentMethod: r.paymentStatus === 'PAID' ? 'Payé' : 'Non payé',
      metadata: r
    };
  }

  private normalizeRide(r: any, source: string): HistoryItem {
    const status = r.status || 'COMPLETED';
    const typeMap: any = {
      'PENDING': 'RIDE_REQUEST',
      'ACCEPTED': 'RIDE_ACCEPTED',
      'DRIVER_ARRIVING': 'DRIVER_ARRIVING',
      'IN_PROGRESS': 'RIDE_STARTED',
      'COMPLETED': source === 'SHARED_RIDE' ? 'SHARED_RIDE_COMPLETED' : 'RIDE_COMPLETED',
      'CANCELLED': 'RIDE_CANCELLED',
      'REJECTED': 'RIDE_REJECTED'
    };

    const type = typeMap[status] || 'RIDE_COMPLETED';
    const amount = r.price || r.estimatedPrice || r.totalPrice || 0;

    const from = r.departure || 'Départ non précisé';
    const to = r.destination || 'Destination non précisée';

    return {
      id: r.id,
      type: type,
      title: this.getRideTitle(type),
      description: `Trajet ${from} → ${to}`,
      date: r.date || r.createdAt || new Date().toISOString(),
      status: status,
      amount: amount,
      relatedEntityId: r.id,
      relatedEntityType: 'RIDE',
      route: { from, to },
      driverName: r.driverName || (r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : null) || 'Chauffeur non spécifié',
      vehicleName: r.vehicleName || (r.driver?.vehicle ? `${r.driver.vehicle.brand} ${r.driver.vehicle.model}` : null) || 'Véhicule non spécifié',
      paymentMethod: r.paymentMethod || 'Espèces',
      metadata: r
    };
  }

  private getRideTitle(type: string): string {
    switch(type) {
      case 'RIDE_REQUEST': return 'Demande de course';
      case 'RIDE_ACCEPTED': return 'Course acceptée';
      case 'DRIVER_ARRIVING': return 'Chauffeur arrive';
      case 'RIDE_STARTED': return 'Course démarrée';
      case 'RIDE_COMPLETED': return 'Course terminée';
      case 'RIDE_CANCELLED': return 'Course annulée';
      case 'RIDE_REJECTED': return 'Demande refusée';
      case 'SHARED_RIDE_COMPLETED': return 'Trajet partagé terminé';
      default: return 'Activité course';
    }
  }

  calculateStats(): void {
    if (this.isTenantMode) {
      this.stats = {
        completed: this.historyItems.filter(i => i.status === 'COMPLETED').length,
        cancelled: this.historyItems.filter(i => i.status === 'CANCELLED' || i.status === 'REJECTED').length,
        spent: this.historyItems.filter(i => i.status === 'COMPLETED').reduce((sum, i) => sum + i.amount, 0),
        reviews: 0
      };
    } else {
      const paymentsSum = this.historyItems.filter(i => i.type === 'PAYMENT').reduce((sum, i) => sum + i.amount, 0);
      const refundsSum = this.historyItems.filter(i => i.type === 'REFUND').reduce((sum, i) => sum + i.amount, 0);
      
      this.stats = {
        completed: this.historyItems.filter(i => i.status === 'COMPLETED' || i.type.includes('COMPLETED')).length,
        cancelled: this.historyItems.filter(i => i.status === 'CANCELLED' || i.status === 'REJECTED').length,
        spent: Math.max(0, paymentsSum - refundsSum),
        reviews: this.historyItems.filter(i => i.type === 'REVIEW_SENT').length
      };
    }
  }

  applyFilters(): void {
    let result = [...this.historyItems];

    if (this.selectedType !== 'Tous') {
      const typeMap: any = {
        'Courses': ['RIDE_COMPLETED', 'RIDE_CANCELLED', 'RIDE_REJECTED'],
        'Locations': ['RIDE_COMPLETED', 'RIDE_CANCELLED', 'RIDE_REJECTED'],
        'Trajets partagés': ['SHARED_RIDE_COMPLETED'],
        'Paiements': ['PAYMENT'],
        'Remboursements': ['REFUND'],
        'Avis': ['REVIEW_SENT']
      };
      const types = typeMap[this.selectedType];
      if (types) {
        result = result.filter(item => types.includes(item.type));
      }
    }

    if (this.selectedStatus !== 'Tous') {
      const statusMap: any = {
        'Terminé': ['COMPLETED'],
        'Annulé': ['CANCELLED'],
        'Refusé': ['REJECTED'],
        'Payé': ['PAID'],
        'Remboursé': ['REFUNDED'],
        'Envoyé': ['SENT']
      };
      const statuses = statusMap[this.selectedStatus];
      if (statuses) {
        result = result.filter(item => statuses.includes(item.status));
      }
    }

    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        (item.driverName || '').toLowerCase().includes(q) ||
        (item.vehicleName || '').toLowerCase().includes(q) ||
        (item.route?.from || '').toLowerCase().includes(q) ||
        (item.route?.to || '').toLowerCase().includes(q) ||
        this.getStatusLabel(item.status).toLowerCase().includes(q) ||
        item.amount.toString().includes(q)
      );
    }

    switch (this.sortBy) {
      case 'recent': result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case 'amountDesc': result.sort((a, b) => b.amount - a.amount); break;
      case 'amountAsc': result.sort((a, b) => a.amount - b.amount); break;
    }

    this.filteredHistory = result;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
      case 'SENT': return 'status-success';
      case 'CANCELLED':
      case 'REJECTED': return 'status-danger';
      case 'REFUNDED': return 'status-info';
      default: return 'status-warning';
    }
  }

  getStatusLabel(status: string): string {
    return this.STATUS_MAP[status] || status;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'RIDE_COMPLETED': return 'ion-md-car';
      case 'SHARED_RIDE_COMPLETED': return 'ion-md-people';
      case 'RIDE_CANCELLED': return 'ion-md-close-circle';
      case 'RIDE_REJECTED': return 'ion-md-alert';
      case 'PAYMENT': return 'ion-md-cash';
      case 'REFUND': return 'ion-md-undo';
      case 'REVIEW_SENT': return 'ion-md-star';
      default: return 'ion-md-time';
    }
  }

  openDetails(item: HistoryItem): void {
    this.selectedItem = item;
    this.showDetailsModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showDetailsModal = false;
    this.selectedItem = null;
    document.body.style.overflow = 'auto';
  }

  navigateTo(item: HistoryItem): void {
    if (this.isTenantMode) {
      this.router.navigate(['/client/reservations']);
      this.closeModal();
      return;
    }
    switch(item.type) {
      case 'PAYMENT': this.router.navigate(['/client/payments']); break;
      case 'REVIEW_SENT': this.router.navigate(['/client/reviews']); break;
      case 'RIDE_CANCELLED': 
      case 'RIDE_REJECTED': this.router.navigate(['/client/request-ride']); break;
      case 'RIDE_COMPLETED': 
      case 'SHARED_RIDE_COMPLETED': this.router.navigate(['/client/reservations']); break;
    }
    this.closeModal();
  }
}
