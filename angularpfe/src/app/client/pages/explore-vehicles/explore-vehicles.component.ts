import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { RentalService } from '../../../services/rental.service';
import { RentalRequest, Vehicle as BackendVehicle } from '../../../models/rental.model';
import * as L from 'leaflet';
import { resolveVehiclePhotoUrl, vehiclePhotoFallback } from '../../../shared/utils/vehicle-image.util';
import { VehicleFavoritesService } from '../../../services/vehicle-favorites.service';
import { SearchService } from '../../../services/search.service';
import { AiRecommendation } from '../../../services/ai-recommendation.service';
import { AuthService } from '../../../auth/auth.service';

interface ExploreVehicle {
  id: number;
  name: string;
  category: string;
  city: string;
  price: number;
  rating: number;
  transmission: string;
  fuel: string;
  seats: number;
  owner: string;
  image?: string;
  description?: string;
  isAvailable: boolean;
  isFavorite: boolean;
  licensePlate?: string;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-explore-vehicles',
  templateUrl: './explore-vehicles.component.html',
  styleUrls: ['./explore-vehicles.component.css']
})
export class ExploreVehiclesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('exploreMap') exploreMapRef?: ElementRef<HTMLDivElement>;

  viewMode: 'list' | 'map' = 'list';
  selectedVehicle: ExploreVehicle | null = null;
  mapZoneLabel = 'Tunisie';
  private leafletMap?: L.Map;
  private mapMarkers: L.Marker[] = [];
  private mapNeedsInit = false;
  
  // Modals state
  showRentModal = false;
  showDetailsModal = false;
  vehicleToRent: ExploreVehicle | null = null;
  vehicleDetails: ExploreVehicle | null = null;
  
  // Toast state
  toastMessage: string | null = null;

  // Search & Filters state
  searchQuery = '';
  searchLocation = '';
  startDate: string = '';
  endDate: string = '';
  pickupLocation = '';
  returnLocation = '';
  reservationMessage = '';
  errorMessage = '';
  isSubmitting = false;
  
  selectedCategory = 'Toutes';
  selectedTransmission = 'Toutes';
  selectedFuel = 'Tous';
  maxPrice = 500;
  minRating = 0;
  
  sortBy = 'default';
  showFavoritesOnly = false;

  vehicles: ExploreVehicle[] = [];
  filteredVehicles: ExploreVehicle[] = [];
  isLoading = false;
  aiHighlightId: number | null = null;

  get aiVehicleIds(): number[] {
    return this.filteredVehicles.map(v => v.id);
  }

  private favoritesSub?: Subscription;
  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private rentalService: RentalService,
    private favoritesService: VehicleFavoritesService,
    private searchService: SearchService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchQuery !== term) {
        this.searchQuery = term;
        this.applyClientFilters();
        this.loadVehicles();
      }
    });
    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery = params['search'];
      if (params['category']) this.selectedCategory = params['category'];
    });
    this.favoritesSub = this.favoritesService.favorites$.subscribe(() => {
      this.syncFavoriteFlags();
      this.applyClientFilters();
    });
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.favoritesSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.viewMode === 'map' && this.mapNeedsInit && this.exploreMapRef) {
      this.initLeafletMap();
      this.mapNeedsInit = false;
    }
  }

  loadVehicles(): void {
    this.isLoading = true;
    const params = {
      q: this.searchQuery.trim() || undefined,
      location: this.searchLocation.trim() || undefined,
      category: this.selectedCategory,
      maxPrice: this.maxPrice
    };
    this.rentalService.getAvailableVehicles(params).subscribe({
      next: (data: BackendVehicle[]) => {
        this.vehicles = data.map(v => this.mapBackendVehicle(v));

        this.syncFavoriteFlags();

        this.applyClientFilters();
        this.updateMapZoneLabel();
        this.isLoading = false;
        if (this.viewMode === 'map') {
          this.mapNeedsInit = true;
          setTimeout(() => this.refreshMapMarkers(), 0);
        }

        const vehicleId = this.route.snapshot.queryParamMap.get('vehicleId');
        if (vehicleId) {
          const veh = this.vehicles.find(v => v.id === Number(vehicleId));
          if (veh) this.openDetails(veh);
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des véhicules:', err);
        this.isLoading = false;
        // Fallback to empty or previous data if error
        this.filteredVehicles = [...this.vehicles];
      }
    });
  }

  private mapBackendVehicle(v: BackendVehicle): ExploreVehicle {
    return {
      id: v.id!,
      name: `${v.brand} ${v.model}`,
      category: v.category || 'Compacte',
      city: v.location || 'Tunis',
      price: v.dailyPrice || 0,
      rating: v.rating ?? 4.5,
      transmission: v.transmission || 'Automatique',
      fuel: v.fuelType || 'Essence',
      seats: v.seats || 5,
      owner: v.owner ? `${v.owner.firstName} ${v.owner.lastName}` : 'GoRide Owner',
      image: resolveVehiclePhotoUrl(v.photoUrl || v.imageUrl, v.licensePlate) || '',
      description: v.description,
      licensePlate: v.licensePlate,
      isAvailable: v.status === 'AVAILABLE' || v.available === true,
      isFavorite: this.favoritesService.isFavorite(v.id!),
      latitude: v.latitude,
      longitude: v.longitude
    };
  }

  toggleView(mode: 'list' | 'map'): void {
    this.viewMode = mode;
    this.selectedVehicle = null;
    if (mode === 'map') {
      this.mapNeedsInit = true;
    }
  }

  private initLeafletMap(): void {
    const el = this.exploreMapRef?.nativeElement;
    if (!el || this.leafletMap) {
      if (this.leafletMap) this.refreshMapMarkers();
      return;
    }
    this.leafletMap = L.map(el, { center: [34.0, 9.5], zoom: 7 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.leafletMap);
    this.refreshMapMarkers();
    setTimeout(() => this.leafletMap?.invalidateSize(), 200);
  }

  private refreshMapMarkers(): void {
    if (!this.leafletMap) return;
    this.mapMarkers.forEach(m => m.remove());
    this.mapMarkers = [];
    const withCoords = this.filteredVehicles.filter(v => v.latitude != null && v.longitude != null);
    withCoords.forEach(v => {
      const marker = L.marker([v.latitude!, v.longitude!])
        .addTo(this.leafletMap!)
        .bindPopup(`<strong>${v.name}</strong><br>${v.city}<br>${v.price} DT/jour`);
      marker.on('click', () => this.selectVehicle(v));
      this.mapMarkers.push(marker);
    });
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map(v => [v.latitude!, v.longitude!] as L.LatLngTuple));
      this.leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }

  private updateMapZoneLabel(): void {
    const loc = this.searchLocation.trim();
    this.mapZoneLabel = loc ? `Zone : ${loc}` : 'Tunisie — véhicules disponibles';
  }

  selectVehicle(vehicle: any): void {
    this.selectedVehicle = vehicle;
  }

  closePopup(): void {
    this.selectedVehicle = null;
  }

  applyFilters(): void {
    this.loadVehicles();
  }

  onVehicleImageError(v: ExploreVehicle, event: Event): void {
    const img = event.target as HTMLImageElement | null;
    const fallback = vehiclePhotoFallback('', v.licensePlate, img?.src);
    if (fallback) {
      v.image = fallback;
      if (img) img.src = fallback;
      return;
    }
    v.image = '';
  }

  onAiRecommended(rec: AiRecommendation): void {
    if (!rec.recommendedId) {
      return;
    }
    this.aiHighlightId = rec.recommendedId;
    const v = this.filteredVehicles.find(x => x.id === rec.recommendedId)
      ?? this.vehicles.find(x => x.id === rec.recommendedId);
    if (v) {
      this.openDetails(v);
      setTimeout(() => {
        document.getElementById('ai-target-' + rec.recommendedId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
    this.toastMessage = rec.headline || 'Recommandation appliquée';
    setTimeout(() => (this.toastMessage = null), 4000);
  }

  get favoritesCount(): number {
    return this.favoritesService.count;
  }

  toggleFavoritesFilter(): void {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.applyClientFilters();
  }

  onClientFilterChange(): void {
    this.applyClientFilters();
  }

  private applyClientFilters(): void {
    this.filteredVehicles = this.vehicles.filter(v => {
      const matchTransmission = this.selectedTransmission === 'Toutes' || v.transmission === this.selectedTransmission;
      const matchFuel = this.selectedFuel === 'Tous' || v.fuel === this.selectedFuel;
      const matchRating = v.rating >= this.minRating;
      const matchFavorites = !this.showFavoritesOnly || v.isFavorite;
      return matchTransmission && matchFuel && matchRating && matchFavorites;
    });
    this.applySort();
    if (this.leafletMap) this.refreshMapMarkers();
  }

  applySort(): void {
    switch (this.sortBy) {
      case 'price-asc':
        this.filteredVehicles.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        this.filteredVehicles.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.filteredVehicles.sort((a, b) => b.rating - a.rating);
        break;
      case 'recent':
        this.filteredVehicles.sort((a, b) => b.id - a.id); // Simulated recency
        break;
      default:
        // Keep default order (by id or relevance)
        break;
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.searchLocation = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCategory = 'Toutes';
    this.selectedTransmission = 'Toutes';
    this.selectedFuel = 'Tous';
    this.maxPrice = 500;
    this.minRating = 0;
    this.sortBy = 'default';
    this.showFavoritesOnly = false;
    this.loadVehicles();
  }

  toggleFavorite(vehicle: ExploreVehicle, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const added = this.favoritesService.toggle(vehicle);
    vehicle.isFavorite = this.favoritesService.isFavorite(vehicle.id);
    if (this.vehicleDetails?.id === vehicle.id) {
      this.vehicleDetails = { ...this.vehicleDetails, isFavorite: vehicle.isFavorite };
    }
    if (this.vehicleToRent?.id === vehicle.id) {
      this.vehicleToRent = { ...this.vehicleToRent, isFavorite: vehicle.isFavorite };
    }
    this.showToast(added ? 'Véhicule ajouté aux favoris' : 'Véhicule retiré des favoris');
  }

  private syncFavoriteFlags(): void {
    this.vehicles.forEach(v => {
      v.isFavorite = this.favoritesService.isFavorite(v.id);
    });
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = null, 3000);
  }

  // --- Modal Logic ---

  openRentModal(vehicle: any): void {
    this.vehicleToRent = vehicle;
    this.pickupLocation = this.searchLocation || vehicle.city;
    this.returnLocation = this.searchLocation || vehicle.city;
    this.reservationMessage = '';
    this.errorMessage = '';
    this.showRentModal = true;
  }

  closeRentModal(): void {
    this.showRentModal = false;
    this.vehicleToRent = null;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // Support DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
    
    // Support YYYY-MM-DD
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
    
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  private formatDateISO(dateStr: string): string {
    const d = this.parseDate(dateStr);
    if (!d) return dateStr;
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  confirmBooking(): void {
    this.errorMessage = '';

    if (!this.vehicleToRent) return;

    if (!this.startDate || !this.endDate || !this.pickupLocation || !this.returnLocation) {
      this.errorMessage = 'Veuillez remplir toutes les informations de location.';
      return;
    }

    const start = this.parseDate(this.startDate);
    const end = this.parseDate(this.endDate);

    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      this.errorMessage = 'Veuillez fournir des dates valides.';
      return;
    }

    if (end < start) {
      this.errorMessage = 'La date de retour doit être après la date de début.';
      return;
    }

    this.isSubmitting = true;

    console.log('--- RENTAL REQUEST DEBUG ---');
    console.log('Selected Vehicle:', this.vehicleToRent);
    console.log('Vehicle ID:', this.vehicleToRent.id);
    console.log('Dates before conversion:', { start: this.startDate, end: this.endDate });
    console.log('Dates after conversion:', { 
      start: this.formatDateISO(this.startDate), 
      end: this.formatDateISO(this.endDate) 
    });
    console.log('Days calculated:', this.calculateTotal() / this.vehicleToRent.price);

    const request: RentalRequest = {
      vehicleId: this.vehicleToRent.id,
      startDate: this.formatDateISO(this.startDate),
      endDate: this.formatDateISO(this.endDate),
      pickupLocation: this.pickupLocation,
      returnLocation: this.returnLocation,
      proposedPrice: this.vehicleToRent.price,
      clientNotes: this.reservationMessage,
      message: this.reservationMessage
    };

    console.log('Payload sent:', request);
    console.log('Endpoint called: POST http://localhost:8081/api/rentals/book');

    this.rentalService.bookVehicle(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeRentModal();
        this.showToast('Votre demande de location a été envoyée avec succès.');
        const user = this.authService.getCurrentUser();
        const isCompany = user?.roles?.some((r: string | { name?: string }) => {
          const name = typeof r === 'string' ? r : r?.name || '';
          return name === 'ROLE_COMPANY' || name === 'COMPANY';
        });
        this.router.navigate(isCompany ? ['/company/requests'] : ['/client/reservations']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('API Error Response:', err);
        
        if (err.status === 0) {
          this.errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est lancé et que CORS est configuré.';
        } else if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.message || err.error?.error || 'Requête invalide.';
        } else if (err.status === 500) {
          this.errorMessage = 'Erreur serveur lors de la création de la demande.';
        } else {
          this.errorMessage = err.error?.message || 'Impossible de créer la demande. Veuillez réessayer.';
        }
      }
    });
  }

  openDetails(vehicle: any): void {
    this.vehicleDetails = vehicle;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.vehicleDetails = null;
  }

  calculateTotal(): number {
    if (!this.startDate || !this.endDate || !this.vehicleToRent) return 0;
    
    console.log('[DEBUG] calculateTotal - Raw Dates:', { start: this.startDate, end: this.endDate });
    
    const start = this.parseDate(this.startDate);
    const end = this.parseDate(this.endDate);
    
    console.log('[DEBUG] calculateTotal - Parsed Dates:', { start, end });
    
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    // Set hours to 0 to avoid DST issues
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('[DEBUG] calculateTotal - Diff Days:', diffDays);
    
    // Inclusive count: Aug 8 to Sep 8 is 31 days (if we count both ends or just the nights)
    if (diffDays <= 0) diffDays = 1;
    
    const total = diffDays * this.vehicleToRent.price;
    console.log('[DEBUG] calculateTotal - Result:', total);
    return total;
  }
}
