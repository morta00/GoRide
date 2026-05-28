import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type AiPreference = 'comfort' | 'economy' | 'family' | 'long_trip' | 'eco' | 'flexible';

export interface AiRecommendation {
  recommendedId?: number;
  recommendedLabel?: string;
  headline: string;
  reason: string;
  tips: string[];
  preference?: string;
  provider: string;
  aiEnabled: boolean;
}

export interface AiStatus {
  aiEnabled: boolean;
  provider: string;
}

@Injectable({ providedIn: 'root' })
export class AiRecommendationService {
  private baseUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<AiStatus> {
    return this.http.get<AiStatus>(`${this.baseUrl}/status`);
  }

  recommendVehicle(params: {
    preference: AiPreference;
    location?: string;
    startDate?: string;
    endDate?: string;
    passengers?: number;
    locale?: string;
    brand?: string;
    maxPrice?: number;
    transmission?: string;
    vehicleIds?: number[];
  }): Observable<AiRecommendation> {
    return this.http
      .post<AiRecommendation>(`${this.baseUrl}/recommend/vehicles`, {
        ...params,
        locale: params.locale || 'fr'
      })
      .pipe(catchError(err => throwError(() => this.toError(err))));
  }

  recommendTrip(params: {
    preference: AiPreference;
    departure?: string;
    destination?: string;
    passengers?: number;
    locale?: string;
  }): Observable<AiRecommendation> {
    return this.http
      .post<AiRecommendation>(`${this.baseUrl}/recommend/trips`, {
        ...params,
        locale: params.locale || 'fr'
      })
      .pipe(catchError(err => throwError(() => this.toError(err))));
  }

  adviseRide(params: {
    preference: AiPreference;
    departure?: string;
    destination?: string;
    rideType?: string;
    passengers?: number;
    locale?: string;
  }): Observable<AiRecommendation> {
    return this.http
      .post<AiRecommendation>(`${this.baseUrl}/advise/ride`, {
        ...params,
        locale: params.locale || 'fr'
      })
      .pipe(catchError(err => throwError(() => this.toError(err))));
  }

  toError(err: unknown): { message: string } {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return { message: 'Serveur injoignable. Vérifiez que le backend tourne sur le port 8081.' };
      }
      const body = err.error;
      if (body?.message) return { message: body.message };
      if (typeof body === 'string') return { message: body };
    }
    return { message: 'Impossible d\'obtenir une recommandation. Réessayez.' };
  }
}
