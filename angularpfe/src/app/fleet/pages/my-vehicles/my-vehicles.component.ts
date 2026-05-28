import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { FormsModule } from '@angular/forms';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { resolveVehiclePhotoUrl, vehiclePhotoFallback } from '../../../shared/utils/vehicle-image.util';
import { VehicleFavoritesService } from '../../../services/vehicle-favorites.service';

@Component({
  selector: 'app-my-vehicles',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-vehicles.component.html',
  styleUrls: ['./my-vehicles.component.css']
})
export class MyVehiclesComponent implements OnInit, OnDestroy {
  vehicles: Vehicle[] = [];
  isLoading = true;
  private _searchTerm: string = '';
  private _selectedStatus: string = 'ALL';

  get searchTerm(): string { return this._searchTerm; }
  set searchTerm(value: string) {
    this._searchTerm = value;
    this.currentPage = 1;
  }

  get selectedStatus(): string { return this._selectedStatus; }
  set selectedStatus(value: string) {
    this._selectedStatus = value;
    this.currentPage = 1;
  }

  // --- Pagination State ---
  currentPage: number = 1;
  itemsPerPage: number = 3;

  get totalPages(): number {
    return Math.ceil(this.totalFilteredItems / this.itemsPerPage);
  }

  get totalFilteredItems(): number {
    return this.filteredVehicles.length;
  }

  get paginatedVehicles(): Vehicle[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVehicles.slice(startIndex, startIndex + this.itemsPerPage);
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

  private favoritesSub?: Subscription;
  private searchSub?: Subscription;

  constructor(
    private vehicleService: VehicleService,
    private favoritesService: VehicleFavoritesService,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnDestroy(): void {
    this.favoritesSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  isFavorite(vehicleId?: number): boolean {
    return vehicleId != null && this.favoritesService.isFavorite(vehicleId);
  }

  toggleFavorite(v: Vehicle, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!v.id) return;
    const added = this.favoritesService.toggle(this.toFavoriteSnapshot(v));
    this.showToast(added ? 'Véhicule ajouté aux favoris' : 'Véhicule retiré des favoris');
  }

  onVehicleImageError(v: Vehicle, event: Event): void {
    const img = event.target as HTMLImageElement | null;
    const fallback = vehiclePhotoFallback(v.photoUrl, v.licensePlate, img?.src);
    if (fallback) {
      v.photoUrl = fallback;
      v.imageUrl = fallback;
      if (img) {
        img.src = fallback;
      }
      return;
    }
    v.photoUrl = '';
    v.imageUrl = '';
  }

  private toFavoriteSnapshot(v: Vehicle) {
    const name = `${v.brand} ${v.model}`.trim();
    return {
      id: v.id,
      name,
      category: v.category || 'Véhicule',
      city: v.location || 'Tunis',
      price: v.dailyPrice || 0,
      rating: v.rating || 0,
      transmission: v.transmission || '—',
      fuel: v.fuelType || '—',
      seats: v.seats || 5,
      owner: 'Propriétaire',
      image: v.photoUrl || v.imageUrl,
      licensePlate: v.licensePlate,
      isAvailable: v.available !== false,
    };
  }

  get filteredVehicles(): Vehicle[] {
    let filtered = this.vehicles || [];

    // Filter by status or favoris
    if (this.selectedStatus === 'FAVORIS') {
      filtered = filtered.filter(v => this.isFavorite(v.id));
    } else if (this.selectedStatus !== 'ALL') {
      filtered = filtered.filter(v => v.status?.toUpperCase() === this.selectedStatus);
    }

    // Filter by search term
    const term = this.searchTerm?.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(v => 
        v.brand?.toLowerCase().includes(term) ||
        v.model?.toLowerCase().includes(term) ||
        v.licensePlate?.toLowerCase().includes(term) ||
        v.location?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  getVehicleCount(status: string): number {
    if (status === 'ALL') return this.vehicles.length;
    if (status === 'FAVORIS') return this.vehicles.filter(v => this.isFavorite(v.id)).length;
    return this.vehicles.filter(v => v.status?.toUpperCase() === status).length;
  }

  ngOnInit(): void {
    console.log('--- MY VEHICLES COMPONENT LOADED ---');
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this._searchTerm !== term) {
        this._searchTerm = term;
        this.currentPage = 1;
      }
    });
    this.favoritesSub = this.favoritesService.favorites$.subscribe(() => {
      if (this.selectedStatus === 'FAVORIS') {
        this.currentPage = 1;
      }
    });
    this.loadVehicles();
  }

  loadVehicles(): void {
    console.log('--- START LOADING VEHICLES ---');
    this.isLoading = true;
    this.vehicleService.getMyFleet().subscribe({
      next: (data: any) => {
        // ... handled logic ...
        let list: Vehicle[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && data.vehicles && Array.isArray(data.vehicles)) {
          list = data.vehicles;
        } else if (data && data.content && Array.isArray(data.content)) {
          list = data.content;
        }
        this.vehicles = list.map(v => {
          const photo = resolveVehiclePhotoUrl(v.photoUrl || v.imageUrl, v.licensePlate);
          return { ...v, photoUrl: photo, imageUrl: photo };
        });

        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('--- API ERROR ---');
        console.error(err);
        this.vehicles = [];
        this.isLoading = false;
      }
    });
  }

  // --- Edit Mode State ---
  editingVehicleId: number | null = null;
  editForm: any = {};
  isSaving = false;

  // --- Toast State ---
  toastMessage: string | null = null;

  showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }

  deleteVehicle(id?: number): void {
    if (!id) return;
    if (confirm('Voulez-vous vraiment supprimer ce véhicule ?')) {
      this.vehicleService.deleteVehicle(id).subscribe({
        next: () => {
          this.vehicles = this.vehicles.filter(v => v.id !== id);
          this.showToast('Véhicule supprimé avec succès.');
        },
        error: (err: any) => {
          alert('Erreur lors de la suppression');
          console.error(err);
        }
      });
    }
  }

  // --- Availability Toggle ---
  isTogglingId: number | null = null;

  toggleAvailability(v: Vehicle): void {
    if (this.isTogglingId === v.id) return;
    const newAvailability = !v.available;
    this.isTogglingId = v.id;
    this.vehicleService.toggleAvailability(v.id, newAvailability).subscribe({
      next: (updated) => {
        v.available = updated.available;
        v.status = updated.status;
        this.isTogglingId = null;
        const msg = newAvailability ? 'Véhicule activé — visible dans les recherches.' : 'Véhicule désactivé — masqué des recherches.';
        this.showToast(msg);
      },
      error: (err) => {
        console.error('Erreur toggle disponibilité', err);
        this.isTogglingId = null;
      }
    });
  }

  // --- Quick Edit Logic ---
  startEdit(v: Vehicle): void {
    this.editingVehicleId = v.id;
    this.editForm = {
      dailyPrice: v.dailyPrice,
      photoUrl: v.photoUrl,
      status: v.status,
      location: v.location,
      description: v.description
    };
  }

  cancelEdit(): void {
    this.editingVehicleId = null;
    this.editForm = {};
  }

  saveEdit(): void {
    if (!this.editingVehicleId) return;
    this.isSaving = true;
    
    this.vehicleService.updateVehicle(this.editingVehicleId, this.editForm).subscribe({
      next: (updatedVehicle) => {
        // Update local object immediately to reflect changes on card
        const v = this.vehicles.find(veh => veh.id === this.editingVehicleId);
        if (v) {
          v.dailyPrice = updatedVehicle.dailyPrice;
          v.photoUrl = updatedVehicle.photoUrl;
          v.status = updatedVehicle.status;
          v.location = updatedVehicle.location;
          v.description = updatedVehicle.description;
        }
        
        this.editingVehicleId = null;
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour', err);
        alert('Erreur lors de la mise à jour du véhicule.');
        this.isSaving = false;
      }
    });
  }

  // --- Details View State ---
  viewingVehicle: Vehicle | null = null;
  vehicleBookings: any[] = [];
  isLoadingBookings = false;

  openDetails(v: Vehicle): void {
    this.viewingVehicle = v;
    this.isLoadingBookings = true;
    this.vehicleBookings = [];
    
    this.vehicleService.getVehicleBookings(v.id).subscribe({
      next: (bookings) => {
        this.vehicleBookings = bookings;
        this.isLoadingBookings = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des réservations', err);
        this.isLoadingBookings = false;
      }
    });
  }

  closeDetails(): void {
    this.viewingVehicle = null;
    this.vehicleBookings = [];
  }

  getStatusLabel(status?: string): string {
    if (!status) return 'Inconnu';
    const labels: Record<string, string> = {
      'AVAILABLE': 'Disponible',
      'RENTED': 'Loué',
      'MAINTENANCE': 'Maintenance',
      'UNAVAILABLE': 'En attente'
    };
    return labels[status.toUpperCase()] || status;
  }

  trackByVehicleId(index: number, vehicle: Vehicle): number {
    return vehicle.id;
  }
}
