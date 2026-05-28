import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'goride_favorite_vehicles';

/** Vehicle snapshot saved in favoris (localStorage). */
export interface FavoriteVehicle {
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
  licensePlate?: string;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
}

@Injectable({ providedIn: 'root' })
export class VehicleFavoritesService {
  private readonly favoritesSubject = new BehaviorSubject<FavoriteVehicle[]>(this.loadFromStorage());
  readonly favorites$ = this.favoritesSubject.asObservable();

  get count(): number {
    return this.favoritesSubject.value.length;
  }

  getAll(): FavoriteVehicle[] {
    return [...this.favoritesSubject.value];
  }

  isFavorite(vehicleId: number): boolean {
    return this.favoritesSubject.value.some(v => v.id === vehicleId);
  }

  /** Toggle favori; returns true if added, false if removed. */
  toggle(source: {
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
    licensePlate?: string;
    isAvailable: boolean;
    latitude?: number;
    longitude?: number;
  }): boolean {
    const list = [...this.favoritesSubject.value];
    const index = list.findIndex(v => v.id === source.id);
    if (index >= 0) {
      list.splice(index, 1);
      this.persist(list);
      return false;
    }
    list.push({
      id: source.id,
      name: source.name,
      category: source.category,
      city: source.city,
      price: source.price,
      rating: source.rating,
      transmission: source.transmission,
      fuel: source.fuel,
      seats: source.seats,
      owner: source.owner,
      image: source.image,
      licensePlate: source.licensePlate,
      isAvailable: source.isAvailable,
      latitude: source.latitude,
      longitude: source.longitude
    });
    this.persist(list);
    return true;
  }

  remove(vehicleId: number): void {
    const list = this.favoritesSubject.value.filter(v => v.id !== vehicleId);
    this.persist(list);
  }

  private persist(list: FavoriteVehicle[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    this.favoritesSubject.next(list);
  }

  private loadFromStorage(): FavoriteVehicle[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.migrateLegacyIds();
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** Old format: only numeric ids in client_favorites */
  private migrateLegacyIds(): FavoriteVehicle[] {
    try {
      const legacy = JSON.parse(localStorage.getItem('client_favorites') || '[]');
      if (!Array.isArray(legacy) || legacy.length === 0) {
        return [];
      }
      localStorage.removeItem('client_favorites');
    } catch {
      /* ignore */
    }
    return [];
  }
}
