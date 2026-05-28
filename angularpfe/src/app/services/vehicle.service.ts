import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// DTO correspondant au VehicleDTO backend
export interface VehicleDTO {
  brand: string;
  model: string;
  licensePlate: string;
  seats?: number;
  hasWifi?: boolean;
  hasBabySeat?: boolean;
  luggageCapacity?: number;
  fuelType?: string;
  color?: string;
  year?: number;
  category?: string;
  driverId?: number;
  photoUrl?: string;
  imageUrl?: string;
}

export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  licensePlate: string;
  seats: number;
  hasWifi: boolean;
  hasBabySeat: boolean;
  luggageCapacity: number;
  fuelType: string;
  available: boolean;
  status?: string;
  dailyPrice?: number;
  location?: string;
  transmission?: string;
  photoUrl?: string;
  imageUrl?: string;
  year?: number;
  color?: string;
  category?: string;
  hasAC?: boolean;
  mileage?: number;
  insuranceInfo?: string;
  depositAmount?: number;
  consumption?: string;
  driverId?: number;
  description?: string;
  bookingCount?: number;
  totalRevenue?: number;
  rating?: number;
  viewCount?: number;
}

/**
 * Statistiques du tableau de bord Propriétaire de Flotte.
 * Correspond à FleetDashboardStatsDTO (backend).
 */
export interface FleetDashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  pendingBookings: number;
  monthlyRevenue: number;
  totalVehiclesTrend: number;
  availableVehiclesTrend: number;
  pendingBookingsTrend: number;
  monthlyRevenueTrend: number;
}

/**
 * Réservation récente dans le dashboard propriétaire.
 * Correspond à RecentBookingDTO (backend).
 */
export interface RecentBooking {
  id: number;
  renterFirstName: string;
  renterLastName: string;
  renterEmail: string;
  renterIsDriver: boolean;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleLicensePlate: string;
  startDate: string;
  endDate: string;
  initialPrice: number;
  proposedPrice: number;
  driverDiscount: number;
  finalPrice: number;
  priceNegotiated: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  clientNotes?: string;
  createdAt: string;
}

/**
 * Activité récente dans le dashboard.
 */
export interface RecentActivity {
  title: string;
  description: string;
  type: string;
  category: 'success' | 'info' | 'warning' | 'danger';
  createdAt: string;
}

const API_URL = 'http://localhost:8081/api/fleet';

@Injectable({ providedIn: 'root' })
export class VehicleService {

  constructor(private http: HttpClient) {}

  /** Retourne les stats du tableau de bord (JWT requis). */
  getDashboardStats(): Observable<FleetDashboardStats> {
    return this.http.get<FleetDashboardStats>(API_URL + '/dashboard/stats');
  }

  /** Retourne les 10 réservations récentes du propriétaire connecté. */
  getRecentBookings(): Observable<RecentBooking[]> {
    return this.http.get<RecentBooking[]>(API_URL + '/dashboard/recent-bookings');
  }

  /** Retourne les 5 activités récentes du propriétaire connecté. */
  getRecentActivities(): Observable<RecentActivity[]> {
    return this.http.get<RecentActivity[]>(API_URL + '/dashboard/recent-activities');
  }

  /** Accepter ou refuser une réservation (status: ACCEPTED | REJECTED). */
  respondToBooking(id: number, status: 'ACCEPTED' | 'REJECTED'): Observable<any> {
    return this.http.patch(`${API_URL}/dashboard/bookings/${id}/respond`, { status });
  }

  /**
   * Ajoute un véhicule à la flotte du Fleet Owner connecté.
   * Le JWT est ajouté automatiquement par le JwtInterceptor.
   */
  addVehicle(dto: VehicleDTO): Observable<Vehicle> {
    return this.http.post<Vehicle>(API_URL + '/vehicles', dto);
  }

  /**
   * Retourne la liste des véhicules du Fleet Owner connecté.
   */
  getMyFleet(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(API_URL + '/vehicles');
  }

  /**
   * Retourne l'historique des réservations pour un véhicule spécifique.
   */
  getVehicleBookings(id: number): Observable<RecentBooking[]> {
    return this.http.get<RecentBooking[]>(`${API_URL}/vehicles/${id}/bookings`);
  }

  /**
   * Active ou désactive la visibilité d'un véhicule dans les recherches clients.
   */
  toggleAvailability(id: number, available: boolean): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${API_URL}/vehicles/${id}/toggle-availability`, { available });
  }

  /**
   * Met à jour un véhicule existant.
   */
  updateVehicle(id: number, data: Partial<VehicleDTO>): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${API_URL}/vehicles/${id}`, data);
  }

  /**
   * Supprime un véhicule de la flotte.
   */
  deleteVehicle(id: number): Observable<any> {
    return this.http.delete(`${API_URL}/vehicles/${id}`);
  }

  /**
   * Assigne un chauffeur à un véhicule.
   */
  assignDriver(vehicleId: number, driverId: number): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${API_URL}/vehicles/${vehicleId}/assign-driver`, { driverId });
  }

  /**
   * Retourne tous les véhicules disponibles (pas besoin de rôle).
   */
  getAvailableVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${API_URL}/vehicles/available`);
  }
}
