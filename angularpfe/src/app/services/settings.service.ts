import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ClientSettings {
  defaultPickupLocation: string;
  defaultReturnLocation: string;
  preferredVehicleType: string;
  preferredTransmission: string;
  preferredFuelType: string;
  maxBudgetPerDay: number;
  preferredRentalDuration: string;
  airConditioning: boolean;
  gps: boolean;
  babySeat: boolean;
  largeTrunk: boolean;
  unlimitedMileage: boolean;
  onlyAvailableVehicles: boolean;
  sortByPrice: boolean;
  proximitySearch: boolean;
  bestRatedFirst: boolean;
  insuranceIncluded: boolean;
  reservationNotifications: boolean;
  returnReminderNotifications: boolean;
  messageNotifications: boolean;
  emailNotifications: boolean;
  allowLocation: boolean;
  shareProfileWithOwners: boolean;
  showFullName: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/client/settings`;

  constructor(private http: HttpClient) { }

  getClientSettings(): Observable<ClientSettings> {
    return this.http.get<ClientSettings>(this.apiUrl);
  }

  saveRentalPreferences(payload: any): Observable<ClientSettings> {
    return this.http.put<ClientSettings>(`${this.apiUrl}/rental-preferences`, payload);
  }

  saveSearchPreferences(payload: any): Observable<ClientSettings> {
    return this.http.put<ClientSettings>(`${this.apiUrl}/search-preferences`, payload);
  }

  saveNotificationPreferences(payload: any): Observable<ClientSettings> {
    return this.http.put<ClientSettings>(`${this.apiUrl}/notification-preferences`, payload);
  }

  savePrivacySettings(payload: any): Observable<ClientSettings> {
    return this.http.put<ClientSettings>(`${this.apiUrl}/privacy`, payload);
  }
}
