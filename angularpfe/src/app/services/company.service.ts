import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = `${environment.apiUrl}/company`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }

  getRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests`);
  }

  createServiceRequest(request: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/service-requests`, request);
  }

  cancelServiceRequest(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/service-requests/${id}/cancel`, {});
  }

  confirmReservation(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/service-requests/${id}/confirm`, {});
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history`);
  }

  getReviews(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reviews`);
  }

  getConversations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations`);
  }

  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notifications`);
  }

  getRecentNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notifications/recent`);
  }

  getPayments(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payments`);
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  getDocuments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/documents`);
  }

  getSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/settings`);
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/settings`, settings);
  }

  getSidebarCounts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sidebar-counts`);
  }

  getAvailableVehicles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available-vehicles`);
  }

  getAvailableDrivers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available-drivers`);
  }
}
