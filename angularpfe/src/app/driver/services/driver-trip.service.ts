import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DriverTrip {
  id: number;
  departure: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  status: string;
  notes?: string;
  createdAt: string;
  
  // Flattened info from DTO
  driverId?: number;
  driverName?: string;
  vehicleId?: number;
  vehicleName?: string;
  vehiclePlate?: string;

  // For unified list
  source?: string;
  clientName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DriverTripService {
  private baseApiUrl = environment.apiUrl; // http://localhost:8081/api

  constructor(private http: HttpClient) {}

  getTrips(): Observable<DriverTrip[]> {
    return this.http.get<DriverTrip[]>(`${this.baseApiUrl}/driver/trips`);
  }

  createTrip(payload: any): Observable<DriverTrip> {
    const dto = {
      departure: payload.departure,
      destination: payload.destination,
      departureTime: `${payload.date}T${payload.time}`,
      availableSeats: payload.seats,
      pricePerSeat: payload.price,
      notes: payload.comment,
      vehicleId: payload.vehicleId
    };
    return this.http.post<DriverTrip>(`${this.baseApiUrl}/driver/trips`, dto);
  }

  updateTrip(id: number, payload: any): Observable<DriverTrip> {
    return this.http.put<DriverTrip>(`${this.baseApiUrl}/driver/trips/${id}`, payload);
  }

  updateStatus(id: number | string, status: string): Observable<DriverTrip> {
    return this.http.patch<DriverTrip>(`${this.baseApiUrl}/driver/trips/${id}/status`, { status });
  }

  updateRideRequestStatus(id: number | string, status: string): Observable<any> {
    if (status === 'IN_PROGRESS') {
      return this.http.put(`${this.baseApiUrl}/rides/requests/${id}/start`, {});
    } else if (status === 'COMPLETED') {
      return this.http.put(`${this.baseApiUrl}/rides/requests/${id}/complete`, {});
    } else if (status === 'CANCELLED') {
      return this.http.put(`${this.baseApiUrl}/rides/requests/${id}/cancel`, {});
    }
    return this.http.put(`${this.baseApiUrl}/rides/requests/${id}/status`, { status });
  }

  republishTrip(id: number | string): Observable<DriverTrip> {
    return this.http.post<DriverTrip>(`${this.baseApiUrl}/driver/trips/${id}/republish`, {});
  }

  deleteTrip(id: number): Observable<any> {
    return this.http.delete(`${this.baseApiUrl}/driver/trips/${id}`);
  }
}
