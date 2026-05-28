import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RentalContract, RentalRequest, Vehicle } from '../models/rental.model';
import { environment } from '../../environments/environment';

export interface VehicleSearchParams {
  q?: string;
  location?: string;
  category?: string;
  maxPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RentalService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Vehicle endpoints
  getAvailableVehicles(params?: VehicleSearchParams): Observable<Vehicle[]> {
    let httpParams = new HttpParams();
    if (params?.q) httpParams = httpParams.set('q', params.q);
    if (params?.location) httpParams = httpParams.set('location', params.location);
    if (params?.category && params.category !== 'Toutes') {
      httpParams = httpParams.set('category', params.category);
    }
    if (params?.maxPrice != null) httpParams = httpParams.set('maxPrice', String(params.maxPrice));
    return this.http.get<Vehicle[]>(`${this.apiUrl}/fleet/vehicles/available`, { params: httpParams });
  }

  getFleetVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/fleet/vehicles`);
  }

  addVehicle(vehicle: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.apiUrl}/fleet/vehicles`, vehicle);
  }

  uploadVehiclePhoto(file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ photoUrl: string }>(`${this.apiUrl}/fleet/vehicles/photo`, formData);
  }

  deleteVehicle(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/fleet/vehicles/${id}`);
  }

  // Rental endpoints
  bookVehicle(request: RentalRequest): Observable<RentalContract> {
    return this.http.post<RentalContract>(`${this.apiUrl}/rentals/book`, request);
  }

  getClientReservations(): Observable<RentalContract[]> {
    return this.http.get<RentalContract[]>(`${this.apiUrl}/rentals/client`);
  }

  getOwnerReservations(): Observable<RentalContract[]> {
    return this.http.get<RentalContract[]>(`${this.apiUrl}/rentals/owner`);
  }

  getOwnerCompanyServiceRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fleet/company-requests`);
  }

  respondOwnerCompanyRequest(id: number | string, status: string): Observable<any> {
    const numericId = String(id).replace(/^csr-/, '');
    return this.http.patch<any>(`${this.apiUrl}/fleet/company-requests/${numericId}/respond`, { status });
  }

  respondToReservation(id: number, status: string, newPrice?: number): Observable<RentalContract> {
    const body: any = { status };
    if (newPrice !== undefined) body.newPrice = newPrice;
    return this.http.patch<RentalContract>(`${this.apiUrl}/rentals/${id}/respond`, body);
  }

  getOwnerCalendar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rentals/owner/calendar`);
  }

  cancelReservation(id: string | number): Observable<RentalContract> {
    return this.http.patch<RentalContract>(`${this.apiUrl}/rentals/${id}/cancel`, {});
  }

  requestExtension(id: string | number, newEndDate: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rentals/${id}/extend`, { newEndDate });
  }

  getInvoice(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rentals/${id}/invoice`);
  }
}
