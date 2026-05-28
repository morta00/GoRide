import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { RentalService } from '../../services/rental.service';
import { Vehicle as BackendVehicle } from '../../models/rental.model';
import { resolveVehiclePhotoUrl } from '../../shared/utils/vehicle-image.util';

export interface PartnerVehicle {
  id: string | number;
  licensePlate?: string;
  name: string;
  category: string;
  location: string;
  image: string;
  type: string; // transmission
  fuel: string;
  seats: number;
  rating: number;
  agency: string;
  dailyPrice: number; // Prix normal public
  driverPrice: number; // Prix chauffeur (72% du prix normal)
  discount: number; // 28%
  description: string;
  status: 'available' | 'rented';
}

@Injectable({
  providedIn: 'root'
})
export class PartnerVehicleService {
  private STORAGE_KEY = 'driver_partner_vehicle';
  private WORK_MODE_KEY = 'driver_work_mode';
  
  private selectedVehicleSubject = new BehaviorSubject<PartnerVehicle | null>(null);
  selectedVehicle$ = this.selectedVehicleSubject.asObservable();

  constructor(
    private http: HttpClient,
    private rentalService: RentalService
  ) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      this.selectedVehicleSubject.next(JSON.parse(data));
    }
  }

  getAvailableVehicles(): Observable<PartnerVehicle[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/driver/partner-vehicles`).pipe(
      map((backendVehicles: any[]) => backendVehicles.map((v: any) => this.mapToPartnerVehicle(v)))
    );
  }

  private mapToPartnerVehicle(v: BackendVehicle): PartnerVehicle {
    const dailyPrice = v.dailyPrice || 100;
    // Calculation rule: driverPrice = dailyPrice * 0.72 (28% discount)
    const driverPrice = Math.round(dailyPrice * 0.72);
    
    return {
      id: v.id || Math.random(),
      licensePlate: v.licensePlate,
      name: `${v.brand} ${v.model}`,
      category: v.category || 'Standard',
      location: v.location || 'Tunis',
      image: resolveVehiclePhotoUrl(v.photoUrl || v.imageUrl, v.licensePlate) || '',
      type: v.transmission || 'Automatique',
      fuel: v.fuelType || 'Essence',
      seats: v.seats || 5,
      rating: v.rating || 4.5,
      agency: v.owner ? `${v.owner.firstName} ${v.owner.lastName}` : 'Agence GoRide',
      dailyPrice: dailyPrice,
      driverPrice: driverPrice,
      discount: 28,
      description: v.description || 'Véhicule de qualité pour un travail confortable et sécurisé.',
      status: v.status === 'AVAILABLE' ? 'available' : 'rented'
    };
  }

  getMyVehicle(): Observable<PartnerVehicle | null> {
    return this.http.get<any>(`${environment.apiUrl}/driver/vehicle`).pipe(
      map(v => v ? this.mapToPartnerVehicle(v) : null),
      tap(v => this.selectedVehicleSubject.next(v))
    );
  }

  getWorkVehicle(): Observable<{
    configured: boolean;
    mode: 'OWN_VEHICLE' | 'RENTED_VEHICLE' | null;
    vehicle: {
      id: number;
      brand: string;
      model: string;
      licensePlate: string;
      ownerName?: string;
      status: string;
    } | null;
  }> {
    return this.http.get<any>(`${environment.apiUrl}/driver/work-vehicle`);
  }

  savePersonalVehicleBackend(v: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/driver/vehicle`, v);
  }

  selectVehicle(vehicle: PartnerVehicle): Observable<void> {
    // Note: Selection in DB would require a separate endpoint like PATCH /api/driver/vehicle/assign
    // For now we still use localStorage as a session cache, but getMyVehicle is the truth.
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vehicle));
    this.selectedVehicleSubject.next(vehicle);
    return of(undefined).pipe(delay(500));
  }

  clearSelection(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.selectedVehicleSubject.next(null);
  }

  removeWorkVehicle(): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/driver/work-vehicle`);
  }

  getDriverDocuments(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/driver/documents`);
  }

  getVehicleHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/driver/vehicle-history`);
  }
}
