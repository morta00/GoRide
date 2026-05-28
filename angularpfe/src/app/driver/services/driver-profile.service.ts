import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DriverProfile {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  country: string;
  preferredLanguage: string;
  verificationStatus: string;
  licenseNumber: string;
  drivingExperienceYears: number;
  availabilityStatus: string;
  workMode: string;
  bio: string;
  rating: number;
  totalTrips: number;
}

@Injectable({
  providedIn: 'root'
})
export class DriverProfileService {
  private apiUrl = `${environment.apiUrl}/drivers/me/profile`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(this.apiUrl);
  }

  updateProfile(data: any): Observable<DriverProfile> {
    return this.http.patch<DriverProfile>(this.apiUrl, data);
  }

  // General user update if needed
  updateUser(data: any): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/users/me`, data);
  }

  changePassword(data: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/users/me/password`, data);
  }
}

