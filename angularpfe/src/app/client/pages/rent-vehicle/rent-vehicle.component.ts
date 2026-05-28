import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RentalService } from '../../../services/rental.service';
import { Vehicle, RentalRequest } from '../../../models/rental.model';
import { AuthService } from '../../../auth/auth.service';
import { VehicleFavoritesService } from '../../../services/vehicle-favorites.service';
import { resolveVehiclePhotoUrl, vehiclePhotoFallback } from '../../../shared/utils/vehicle-image.util';
import { AiInsightPanelComponent } from '../../../components/ai-insight-panel/ai-insight-panel.component';
import { AiRecommendation } from '../../../services/ai-recommendation.service';

@Component({
  selector: 'app-rent-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, AiInsightPanelComponent],
  templateUrl: './rent-vehicle.component.html',
  styleUrls: ['./rent-vehicle.component.css']
})
export class RentVehicleComponent implements OnInit, OnDestroy {
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  isLoading = true;

  // Filters
  filterBrand = '';
  filterMaxPrice: number | null = null;
  filterTransmission = '';
  filterLocation = '';
  showFavoritesOnly = false;
  rentPassengers = 2;
  rentStartDate = '';
  rentEndDate = '';
  // Booking Modal
  selectedVehicle: Vehicle | null = null;
  bookingRequest: RentalRequest = {
    vehicleId: 0,
    startDate: '',
    endDate: '',
    proposedPrice: 0,
    clientNotes: ''
  };
  isDriver = false;
  isBooking = false;
  toastMessage: string | null = null;

  private favoritesSub?: Subscription;

  constructor(
    private rentalService: RentalService,
    private authService: AuthService,
    private favoritesService: VehicleFavoritesService
  ) {}

  ngOnInit(): void {
    this.favoritesSub = this.favoritesService.favorites$.subscribe(() => this.applyFilters());
    this.loadVehicles();
    const user = this.authService.getCurrentUser();
    this.isDriver = user?.roles?.includes('ROLE_DRIVER') || false;
  }

  ngOnDestroy(): void {
    this.favoritesSub?.unsubscribe();
  }

  isFavorite(vehicleId?: number): boolean {
    return vehicleId != null && this.favoritesService.isFavorite(vehicleId);
  }

  toggleFavorite(v: Vehicle, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!v.id) return;
    const image = resolveVehiclePhotoUrl(v.photoUrl || v.imageUrl, v.licensePlate);
    const added = this.favoritesService.toggle({
      id: v.id,
      name: `${v.brand} ${v.model}`.trim(),
      category: v.category || 'Véhicule',
      city: v.location || 'Tunis',
      price: v.dailyPrice,
      rating: v.rating || 0,
      transmission: v.transmission || '—',
      fuel: v.fuelType || '—',
      seats: v.seats,
      owner: 'Propriétaire',
      image,
      licensePlate: v.licensePlate,
      isAvailable: true,
      latitude: v.latitude,
      longitude: v.longitude
    });
    this.toastMessage = added ? 'Véhicule ajouté aux favoris' : 'Véhicule retiré des favoris';
    setTimeout(() => (this.toastMessage = null), 3000);
  }

  loadVehicles(): void {
    this.rentalService.getAvailableVehicles().subscribe({
      next: (data: Vehicle[]) => {
        this.vehicles = data.map(v => ({
          ...v,
          photoUrl: resolveVehiclePhotoUrl(v.photoUrl || v.imageUrl, v.licensePlate) || v.photoUrl,
          imageUrl: resolveVehiclePhotoUrl(v.photoUrl || v.imageUrl, v.licensePlate) || v.imageUrl
        }));
        this.filteredVehicles = this.vehicles;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur', err);
        this.isLoading = false;
      }
    });
  }

  get favoritesCount(): number {
    return this.favoritesService.count;
  }

  get aiVehicleIds(): number[] {
    return this.filteredVehicles.map(v => v.id!).filter(id => id != null);
  }

  onVehicleImageError(v: Vehicle, event: Event): void {
    const img = event.target as HTMLImageElement | null;
    const fallback = vehiclePhotoFallback(v.photoUrl, v.licensePlate, img?.src);
    if (fallback) {
      v.photoUrl = fallback;
      v.imageUrl = fallback;
      if (img) img.src = fallback;
      return;
    }
    v.photoUrl = '';
    v.imageUrl = '';
  }

  onAiRecommended(rec: AiRecommendation): void {
    if (!rec.recommendedId) return;
    const v = this.filteredVehicles.find(x => x.id === rec.recommendedId);
    if (v) {
      this.openBooking(v);
      this.toastMessage = rec.headline || 'Véhicule recommandé';
      setTimeout(() => (this.toastMessage = null), 4000);
    }
  }

  toggleFavoritesFilter(): void {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredVehicles = this.vehicles.filter(v => {
      let match = true;
      if (this.filterBrand && !v.brand.toLowerCase().includes(this.filterBrand.toLowerCase())) match = false;
      if (this.filterMaxPrice && v.dailyPrice > this.filterMaxPrice) match = false;
      if (this.filterTransmission && v.transmission !== this.filterTransmission) match = false;
      if (this.filterLocation && !(v.location || '').toLowerCase().includes(this.filterLocation.toLowerCase())) match = false;
      if (this.showFavoritesOnly && !this.isFavorite(v.id)) match = false;
      return match;
    });
  }

  openBooking(v: Vehicle): void {
    this.selectedVehicle = v;
    this.bookingRequest = {
      vehicleId: v.id!,
      startDate: this.rentStartDate,
      endDate: this.rentEndDate,
      proposedPrice: v.dailyPrice,
      clientNotes: ''
    };
  }

  closeBooking(): void {
    this.selectedVehicle = null;
  }

  get discountPreview(): number {
    if (!this.selectedVehicle || !this.bookingRequest.proposedPrice) return 0;
    return this.isDriver ? (this.bookingRequest.proposedPrice * 0.1) : 0; // 10% discount
  }

  get finalPricePreview(): number {
    if (!this.selectedVehicle || !this.bookingRequest.proposedPrice) return 0;
    return this.bookingRequest.proposedPrice - this.discountPreview;
  }

  submitBooking(): void {
    if (!this.bookingRequest.startDate || !this.bookingRequest.endDate) {
      alert('Veuillez sélectionner les dates');
      return;
    }
    
    this.isBooking = true;
    this.rentalService.bookVehicle(this.bookingRequest).subscribe({
      next: (res: any) => {
        alert('Réservation envoyée avec succès !');
        this.isBooking = false;
        this.closeBooking();
      },
      error: (err: any) => {
        alert('Erreur: ' + (err.error?.message || err.message));
        this.isBooking = false;
      }
    });
  }
}
