import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, tap } from 'rxjs/operators';

export interface DriverRequest {
  id: any;
  /** RIDE_REQUEST | SHARED_BOOKING */
  kind?: 'RIDE_REQUEST' | 'SHARED_BOOKING';
  bookingId?: number;
  tripId?: number;
  clientId?: number;
  clientName: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhoto?: string;
  clientAvatar: string;
  clientRating: number;
  from: string;
  to: string;
  distance: string;
  duration: string;
  vehicleType: string;
  paymentMethod: string;
  estimatedAmount: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED';
  requestDate: string;
  clientMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DriverRequestService {
  private apiUrl = `${environment.apiUrl}/rides/requests`;
  /** Dernière erreur chargement inbox covoiturage (403, réseau, etc.). */
  lastSharedInboxError: string | null = null;

  constructor(private http: HttpClient) {}

  getRequests(): Observable<DriverRequest[]> {
    return forkJoin({
      rides: this.http.get<any[]>(`${this.apiUrl}/driver/pending`).pipe(
        catchError(err => {
          console.warn('[Demandes] courses individuelles:', err);
          return of([]);
        })
      ),
      shared: this.loadCovoiturageInbox()
    }).pipe(
      map(({ rides, shared }) => {
        const rideReqs = (rides || []).map(r => this.mapToDriverRequest(r));
        const sharedReqs = (shared || []).map(b => this.mapSharedBooking(b));
        const byKey = new Map<string, DriverRequest>();
        [...sharedReqs, ...rideReqs].forEach(r => {
          const key = r.kind === 'SHARED_BOOKING'
            ? `booking-${r.bookingId ?? r.id}`
            : `ride-${r.id}`;
          byKey.set(key, r);
        });
        return Array.from(byKey.values());
      })
    );
  }

  updateStatus(id: any, status: string): Observable<any> {
    const endpoint = status === 'ACCEPTED' ? 'accept' : 'reject';
    return this.http.put(`${this.apiUrl}/${id}/${endpoint}`, {});
  }

  acceptSharedBooking(bookingId: number): Observable<any> {
    return this.http.put(`${environment.apiUrl}/bookings/driver/${bookingId}/accept`, {});
  }

  rejectSharedBooking(bookingId: number): Observable<any> {
    return this.http.put(`${environment.apiUrl}/bookings/driver/${bookingId}/reject`, {});
  }

  /** Charge les réservations covoiturage (endpoint chauffeur prioritaire). */
  private loadCovoiturageInbox(): Observable<any[]> {
    const primary = `${environment.apiUrl}/driver/covoiturage-requests`;
    const fallback = `${environment.apiUrl}/bookings/driver/inbox`;

    return this.http.get<any[]>(primary).pipe(
      tap(list => console.log('[Demandes] covoiturage (driver):', list?.length ?? 0)),
      catchError(err1 => {
        console.warn('[Demandes] covoiturage primary failed:', err1);
        return this.http.get<any[]>(fallback).pipe(
          tap(list => console.log('[Demandes] covoiturage (bookings/inbox):', list?.length ?? 0)),
          catchError(err2 => {
            console.warn('[Demandes] covoiturage fallback failed:', err2);
            const status = err2?.status ?? err1?.status;
            if (status === 403 || status === 401) {
              this.lastSharedInboxError =
                'Session invalide ou compte non chauffeur. Déconnectez-vous puis reconnectez-vous avec driver@goride.demo';
            } else if (status === 404) {
              this.lastSharedInboxError =
                'API covoiturage introuvable — redémarrez le serveur GoRide (port 8081).';
            } else {
              this.lastSharedInboxError =
                'Impossible de charger les demandes covoiturage. Vérifiez que GoRide tourne sur http://localhost:8081';
            }
            return of([]);
          })
        );
      })
    );
  }

  private mapSharedBooking(b: any): DriverRequest {
    const clientName =
      `${b.passengerFirstName || ''} ${b.passengerLastName || ''}`.trim() ||
      b.passengerEmail ||
      'Passager';
    const nameParts = clientName.split(/\s+/).filter(Boolean);
    const status =
      b.status === 'PENDING_DRIVER'
        ? 'PENDING'
        : b.status === 'CONFIRMED'
          ? 'ACCEPTED'
          : b.status === 'CANCELLED'
            ? 'REJECTED'
            : b.status;
    return {
      id: `booking-${b.id}`,
      kind: 'SHARED_BOOKING',
      bookingId: Number(b.id),
      tripId: b.tripId != null ? Number(b.tripId) : undefined,
      clientId: b.passengerId,
      clientName,
      clientFirstName: b.passengerFirstName || nameParts[0] || '',
      clientLastName: b.passengerLastName || nameParts.slice(1).join(' ') || '',
      clientPhoto: '',
      clientAvatar: '',
      clientRating: 4.8,
      from: b.departure || 'Départ',
      to: b.destination || 'Destination',
      distance: '—',
      duration: '—',
      vehicleType: b.vehicleModel
        ? `${b.vehicleModel} · ${b.seatsBooked || 1} place(s)`
        : `Trajet partagé · ${b.seatsBooked || 1} place(s)`,
      paymentMethod: 'À convenir',
      estimatedAmount: b.totalPrice || 0,
      status,
      requestDate: b.createdAt || new Date().toISOString(),
      clientMessage:
        b.status === 'PENDING_DRIVER'
          ? 'Demande pour rejoindre votre trajet partagé.'
          : 'Passager inscrit sur votre trajet.'
    };
  }

  private mapToDriverRequest(r: any): DriverRequest {
    const clientName = r.clientName || `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.trim() || r.client?.email || 'Client supprimé';
    const nameParts = clientName.split(/\s+/).filter(Boolean);
    return {
      id: r.id,
      kind: 'RIDE_REQUEST',
      clientId: r.clientId ?? r.client?.id,
      clientName,
      clientFirstName: r.client?.firstName || nameParts[0] || '',
      clientLastName: r.client?.lastName || nameParts.slice(1).join(' ') || '',
      clientPhoto: r.clientPhoto || r.client?.photoUrl || '',
      clientAvatar: r.clientPhoto || r.client?.photoUrl || '',
      clientRating: 4.8,
      from: r.departure || 'Non renseigné',
      to: r.destination || 'Non renseigné',
      distance: '10 km', 
      duration: '20 min',
      vehicleType: r.rideType === 'INDIVIDUAL' ? 'Course individuelle' : 'Course collaborative',
      paymentMethod: r.paymentMethod || 'Non spécifié',
      estimatedAmount: r.estimatedPrice || 0,
      status: r.status,
      requestDate: r.createdAt,
      clientMessage: r.comment
    };
  }
}
