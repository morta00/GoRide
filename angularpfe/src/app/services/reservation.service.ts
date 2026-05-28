import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReservationRequest {
  vehicleId: number;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  message?: string;
}

export interface Reservation {
  id: number;
  vehicle?: any;
  renter?: any;
  owner?: any;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = 'http://localhost:8081/api/client/reservations';

  constructor(private http: HttpClient) {}

  createReservation(payload: ReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, payload);
  }

  getMyReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl);
  }

  getClientRentals(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8081/api/rentals/client');
  }

  cancelRental(id: number): Observable<any> {
    return this.http.patch<any>(`http://localhost:8081/api/rentals/${id}/cancel`, {});
  }
}
