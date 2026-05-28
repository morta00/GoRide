import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  FavoriteVehicle,
  VehicleFavoritesService
} from '../../../services/vehicle-favorites.service';
import { resolveVehiclePhotoUrl } from '../../../shared/utils/vehicle-image.util';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  vehicles: FavoriteVehicle[] = [];
  filteredVehicles: FavoriteVehicle[] = [];

  searchQuery = '';
  selectedCategory = 'Toutes';
  selectedAvailability = 'Tous';
  maxPrice = 500;
  sortBy = 'recent';
  toastMessage: string | null = null;

  private favoritesSub?: Subscription;

  constructor(
    private favoritesService: VehicleFavoritesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.favoritesSub = this.favoritesService.favorites$.subscribe(list => {
      this.vehicles = list;
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.favoritesSub?.unsubscribe();
  }

  vehicleImage(v: FavoriteVehicle): string {
    return resolveVehiclePhotoUrl(v.image, v.licensePlate) || v.image || '';
  }

  applyFilters(): void {
    this.filteredVehicles = this.vehicles.filter(v => {
      const matchSearch =
        v.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchCategory =
        this.selectedCategory === 'Toutes' || v.category === this.selectedCategory;

      const matchAvailability =
        this.selectedAvailability === 'Tous' ||
        (this.selectedAvailability === 'Disponibles' && v.isAvailable) ||
        (this.selectedAvailability === 'Indisponibles' && !v.isAvailable);

      const matchPrice = v.price <= this.maxPrice;

      return matchSearch && matchCategory && matchAvailability && matchPrice;
    });

    this.applySort();
  }

  applySort(): void {
    if (this.sortBy === 'price-asc') {
      this.filteredVehicles.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      this.filteredVehicles.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'rating') {
      this.filteredVehicles.sort((a, b) => b.rating - a.rating);
    }
  }

  removeFromFavorites(id: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.favoritesService.remove(id);
    this.showToast('Véhicule retiré des favoris');
  }

  openExplore(vehicleId?: number): void {
    const queryParams = vehicleId ? { vehicleId: String(vehicleId) } : undefined;
    this.router.navigate(['/client/explore'], { queryParams });
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => (this.toastMessage = null), 3000);
  }

  getStat(key: string): string | number {
    const favoriteVehicles = this.vehicles;

    switch (key) {
      case 'total':
        return favoriteVehicles.length;
      case 'available':
        return favoriteVehicles.filter(v => v.isAvailable).length;
      case 'unavailable':
        return favoriteVehicles.filter(v => !v.isAvailable).length;
      case 'avgPrice': {
        if (favoriteVehicles.length === 0) return 0;
        const total = favoriteVehicles.reduce((acc, v) => acc + v.price, 0);
        return Math.round(total / favoriteVehicles.length);
      }
      default:
        return 0;
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'Toutes';
    this.selectedAvailability = 'Tous';
    this.maxPrice = 500;
    this.sortBy = 'recent';
    this.applyFilters();
  }
}
