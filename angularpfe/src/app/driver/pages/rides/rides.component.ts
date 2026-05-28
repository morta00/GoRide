import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DriverTripService, DriverTrip } from '../../services/driver-trip.service';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-rides',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './rides.component.html',
  styleUrls: ['./rides.component.css']
})
export class RidesComponent implements OnInit, OnDestroy {
  allTrips: DriverTrip[] = [];
  filteredTrips: DriverTrip[] = [];
  isLoading = true;
  
  // States
  showFormModal = false;
  showDetailsModal = false;
  showReceiptModal = false;
  isEditing = false;
  selectedTrip: DriverTrip | null = null;
  
  // Form
  tripForm!: FormGroup;
  
  // Filters & Search
  selectedStatus: string = 'ALL';
  searchTerm: string = '';
  sortOption: string = 'recent';
  
  // Stats
  stats = {
    total: 0,
    published: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  };

  private searchSub?: Subscription;
  private pendingOpenTripId: string | null = null;

  constructor(
    private tripService: DriverTripService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadTrips();

    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
        this.searchService.setSearchTerm(this.searchTerm);
        this.applyFilters();
      }
      const openId = params['requestId'] || params['tripId'];
      if (openId) {
        this.pendingOpenTripId = String(openId);
        this.tryOpenPendingTrip();
      }
    });

    this.searchSub = this.searchService.searchTerm$.subscribe(term => {
      if (term !== this.searchTerm) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  initForm(): void {
    this.tripForm = this.fb.group({
      departure: ['', Validators.required],
      destination: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      seats: [4, [Validators.required, Validators.min(1)]],
      price: [10, [Validators.required, Validators.min(1)]],
      vehicle: ['Peugeot 308', Validators.required],
      luggage: [true],
      comment: ['']
    }, { validators: this.locationValidator });
  }

  locationValidator(group: FormGroup) {
    const dep = group.get('departure')?.value;
    const dest = group.get('destination')?.value;
    return dep && dest && dep.toLowerCase() === dest.toLowerCase() ? { sameLocation: true } : null;
  }

  loadTrips(): void {
    this.isLoading = true;
    this.tripService.getTrips().subscribe((data: DriverTrip[]) => {
      this.allTrips = data;
      this.calculateStats();
      this.applyFilters();
      this.isLoading = false;
      this.tryOpenPendingTrip();
    });
  }

  private tryOpenPendingTrip(): void {
    if (!this.pendingOpenTripId || this.isLoading) return;
    const id = this.pendingOpenTripId;
    const trip = this.allTrips.find(t => String(t.id) === id);
    if (trip) {
      this.pendingOpenTripId = null;
      this.openDetailsModal(trip);
      return;
    }
    this.searchTerm = id;
    this.applyFilters();
    const filtered = this.filteredTrips.find(t => String(t.id) === id);
    if (filtered) {
      this.pendingOpenTripId = null;
      this.openDetailsModal(filtered);
    }
  }

  calculateStats(): void {
    this.stats = {
      total: this.allTrips.length,
      published: this.allTrips.filter(t => t.status === 'AVAILABLE' || t.status === 'PUBLISHED').length,
      confirmed: this.allTrips.filter(t => t.status === 'CONFIRMED').length,
      inProgress: this.allTrips.filter(t => t.status === 'IN_PROGRESS').length,
      completed: this.allTrips.filter(t => t.status === 'COMPLETED').length,
      cancelled: this.allTrips.filter(t => t.status === 'CANCELLED').length
    };
  }

  applyFilters(): void {
    let result = [...this.allTrips];

    // 1. Status Filter
    if (this.selectedStatus !== 'ALL') {
      result = result.filter(t => t.status === this.selectedStatus);
    }

    // 2. Search Query
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(t => {
        const departureMatch = (t.departure || '').toLowerCase().includes(term);
        const destinationMatch = (t.destination || '').toLowerCase().includes(term);
        const statusMatch = this.getStatusLabel(t.status).toLowerCase().includes(term);
        const vehicleMatch = (t.vehicleName || '').toLowerCase().includes(term);
        const dateMatch = (t.departureTime || '').toLowerCase().includes(term);
        return departureMatch || destinationMatch || statusMatch || vehicleMatch || dateMatch;
      });
    }

    // 3. Sorting
    switch (this.sortOption) {
      case 'recent':
        result.sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
        break;
      case 'priceAsc':
        result.sort((a, b) => Number(a.pricePerSeat) - Number(b.pricePerSeat));
        break;
      case 'priceDesc':
        result.sort((a, b) => Number(b.pricePerSeat) - Number(a.pricePerSeat));
        break;
    }

    this.filteredTrips = result;
  }

  setFilter(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  // --- Actions ---

  openAddModal(): void {
    this.isEditing = false;
    this.tripForm.reset({ seats: 4, price: 10, vehicle: 'Mon Véhicule', luggage: true });
    this.showFormModal = true;
  }

  openEditModal(trip: DriverTrip): void {
    if (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      alert('Ce trajet ne peut plus être modifié.');
      return;
    }
    this.isEditing = true;
    this.selectedTrip = trip;
    
    // Map DTO to form
    const [date, time] = trip.departureTime.split('T');
    this.tripForm.patchValue({
      departure: trip.departure,
      destination: trip.destination,
      date: date,
      time: time?.substring(0, 5),
      seats: trip.availableSeats,
      price: trip.pricePerSeat,
      vehicle: trip.vehicleName,
      comment: trip.notes
    });
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.selectedTrip = null;
  }

  openDetailsModal(trip: DriverTrip): void {
    this.selectedTrip = trip;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedTrip = null;
  }

  openReceiptModal(trip: DriverTrip): void {
    this.selectedTrip = trip;
    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedTrip = null;
  }

  onSubmit(): void {
    if (this.tripForm.invalid) return;

    const data = this.tripForm.value;
    
    if (this.isEditing && this.selectedTrip) {
      this.tripService.updateTrip(this.selectedTrip.id, data).subscribe(() => {
        this.loadTrips();
        this.closeFormModal();
        alert('Trajet modifié avec succès.');
      });
    } else {
      this.tripService.createTrip(data).subscribe(() => {
        this.loadTrips();
        this.closeFormModal();
        alert('Trajet publié avec succès.');
      });
    }
  }

  updateStatus(tripId: number | string, status: string): void {
    let msg = '';
    if (status === 'CANCELLED') msg = 'Voulez-vous vraiment annuler ce trajet ?';
    if (status === 'IN_PROGRESS') msg = 'Démarrer le trajet maintenant ?';
    if (status === 'COMPLETED') msg = 'Confirmer que le trajet est terminé ?';

    if (msg && !confirm(msg)) return;
    
    // Find the trip to check its source
    const trip = this.allTrips.find(t => String(t.id) === String(tripId));
    if (trip && trip.source === 'RIDE_REQUEST') {
        this.tripService.updateRideRequestStatus(tripId, status).subscribe(() => {
          this.loadTrips();
          if (this.selectedTrip && String(this.selectedTrip.id) === String(tripId)) {
            this.selectedTrip.status = status;
          }
          alert('Statut mis à jour avec succès.');
        });
    } else {
        this.tripService.updateStatus(tripId, status).subscribe(() => {
          this.loadTrips();
          if (this.selectedTrip && String(this.selectedTrip.id) === String(tripId)) {
            this.selectedTrip.status = status;
          }
          alert('Statut mis à jour avec succès.');
        });
    }
  }

  republish(trip: DriverTrip): void {
    if (confirm('Voulez-vous republier ce trajet ?')) {
      this.tripService.republishTrip(trip.id).subscribe(() => {
        this.loadTrips();
        alert('Trajet republié avec succès.');
      });
    }
  }

  goToRequests(tripId: number | string): void {
    this.router.navigate(['/driver/requests'], { queryParams: { tripId } });
  }

  goToChat(tripId: number | string): void {
    this.router.navigate(['/driver/conversations'], { queryParams: { tripId } });
  }

  printReceipt(): void {
    window.print();
  }

  getGrossAmount(): number {
    if (!this.selectedTrip) return 0;
    // For DTO, we'd need total passengers or occupied seats. 
    // Assuming simple calculation for demo.
    return this.selectedTrip.pricePerSeat * (5 - this.selectedTrip.availableSeats);
  }

  getCommission(): number {
    return this.getGrossAmount() * 0.1; // 10% commission
  }

  getNetAmount(): number {
    return this.getGrossAmount() - this.getCommission();
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'AVAILABLE': 'Disponible',
      'PUBLISHED': 'Publié',
      'CONFIRMED': 'Confirmé',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminé',
      'CANCELLED': 'Annulé'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'AVAILABLE': 'status-published',
      'PUBLISHED': 'status-published',
      'CONFIRMED': 'status-confirmed',
      'IN_PROGRESS': 'status-progress',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || '';
  }
}
