import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface RideRequest {
  id?: number;
  departure: string;
  destination: string;
  rideType: string;
  passengers: number;
  paymentMethod: string;
  comment?: string;
  estimatedPrice: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string;
  
  // Flattened info from DTO
  clientId?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientPhoto?: string;
  
  driverId?: number;
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
  driverPhoto?: string;
  vehicleModel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RideRequestService {
  private baseApiUrl = environment.apiUrl; // http://localhost:8081/api

  constructor(private http: HttpClient) {}

  createRideRequest(payload: any): Observable<RideRequest> {
    return this.http.post<RideRequest>(`${this.baseApiUrl}/rides/requests`, payload);
  }

  getMyRideRequests(): Observable<RideRequest[]> {
    return this.http.get<RideRequest[]>(`${this.baseApiUrl}/rides/requests/client/me`);
  }

  getMyCurrentRide(): Observable<RideRequest | null> {
    return this.http.get<RideRequest>(`${this.baseApiUrl}/rides/requests/client/me/current`, { observe: 'response' }).pipe(
      map(res => (res.status === 204 || res.body == null) ? null : res.body as RideRequest)
    );
  }

  getPendingDriverRequests(): Observable<RideRequest[]> {
    return this.http.get<RideRequest[]>(`${this.baseApiUrl}/rides/requests/driver/pending`);
  }

  acceptRideRequest(id: number): Observable<RideRequest> {
    return this.http.put<RideRequest>(`${this.baseApiUrl}/rides/requests/${id}/accept`, {});
  }

  rejectRideRequest(id: number): Observable<RideRequest> {
    return this.http.put<RideRequest>(`${this.baseApiUrl}/rides/requests/${id}/reject`, {});
  }

  cancelRideRequest(id: number): Observable<RideRequest> {
    return this.http.put<RideRequest>(`${this.baseApiUrl}/rides/requests/${id}/cancel`, {});
  }

  startRideRequest(id: number): Observable<RideRequest> {
    return this.http.put<RideRequest>(`${this.baseApiUrl}/rides/requests/${id}/start`, {});
  }

  completeRideRequest(id: number): Observable<RideRequest> {
    return this.http.put<RideRequest>(`${this.baseApiUrl}/rides/requests/${id}/complete`, {});
  }

  getAdminRideServices(): Observable<RideRequest[]> {
    // Matches the user's requested path exactly
    return this.http.get<RideRequest[]>(`${this.baseApiUrl}/admin/services/rides`);
  }
}
