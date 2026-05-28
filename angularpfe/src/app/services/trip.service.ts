import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Trip, TripDTO, Booking, BookingDTO } from '../models/trip.model';

/** Réponse plate API covoiturage (POST + GET). */
export type PassengerBookingDto = Booking & { id: number };

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAvailableTrips(departure?: string, destination?: string): Observable<Trip[]> {
    let url = `${this.apiUrl}/trips`;
    const params: string[] = [];
    if (departure?.trim()) params.push(`departure=${encodeURIComponent(departure.trim())}`);
    if (destination?.trim()) params.push(`destination=${encodeURIComponent(destination.trim())}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<Trip[]>(url);
  }

  getTripById(id: number): Observable<Trip> {
    return this.http.get<Trip>(`${this.apiUrl}/trips/${id}`);
  }

  createTrip(tripData: TripDTO): Observable<Trip> {
    return this.http.post<Trip>(`${this.apiUrl}/driver/trips`, tripData);
  }

  getMyPublishedTrips(): Observable<Trip[]> {
    return this.http.get<Trip[]>(`${this.apiUrl}/driver/trips`);
  }

  cancelTrip(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/driver/trips/${id}`);
  }

  /**
   * Réserve une place. Utilise responseType 'text' car l'ancien backend renvoie parfois
   * un JSON énorme / imbriqué qui provoque « Http failure during parsing ».
   */
  bookTrip(bookingData: BookingDTO): Observable<PassengerBookingDto> {
    return this.http
      .post(`${this.apiUrl}/bookings`, bookingData, {
        observe: 'response',
        responseType: 'text'
      })
      .pipe(
        switchMap(res => this.bookingFromHttpResponse(res, bookingData.tripId)),
        catchError((err: unknown) => {
          const recovered = this.tryRecoverAfterBook(err, bookingData.tripId);
          if (recovered) return recovered;
          if (err instanceof HttpErrorResponse && err.status === 400) {
            const msg = this.toApiError(err).message;
            if (msg.includes('déjà') || msg.includes('inscrit')) {
              return this.fetchBookingAfterCreate(bookingData.tripId);
            }
          }
          return throwError(() => this.toApiError(err));
        })
      );
  }

  /** Liste des réservations covoiturage du passager connecté. */
  getMyBookings(): Observable<PassengerBookingDto[]> {
    return this.http
      .get(`${this.apiUrl}/client/shared-bookings`, { responseType: 'text' })
      .pipe(
        map(body => this.parseBookingList(body)),
        catchError(() =>
          this.http.get(`${this.apiUrl}/bookings/me`, { responseType: 'text' }).pipe(
            map(body => this.parseBookingList(body)),
            catchError(err => throwError(() => this.toApiError(err)))
          )
        )
      );
  }

  cancelBooking(bookingId: number): Observable<{ message?: string }> {
    return this.http
      .delete<{ message?: string }>(`${this.apiUrl}/bookings/${bookingId}`)
      .pipe(catchError(err => throwError(() => this.toApiError(err))));
  }

  cancelBookingByTrip(tripId: number): Observable<{ message?: string }> {
    return this.http
      .delete<{ message?: string }>(`${this.apiUrl}/bookings/by-trip/${tripId}`)
      .pipe(catchError(err => throwError(() => this.toApiError(err))));
  }

  getBookingsByTrip(tripId: number): Observable<PassengerBookingDto[]> {
    return this.http
      .get(`${this.apiUrl}/bookings/trip/${tripId}`, { responseType: 'text' })
      .pipe(
        map(body => this.parseBookingList(body)),
        catchError(err => throwError(() => this.toApiError(err)))
      );
  }

  private bookingFromHttpResponse(
    res: HttpResponse<string>,
    tripId: number
  ): Observable<PassengerBookingDto> {
    if (res.status >= 200 && res.status < 300) {
      const dto = this.parseCreatedBooking(res.body, tripId);
      if (dto) return of(dto);
      return this.fetchBookingAfterCreate(tripId);
    }
    return throwError(() =>
      this.toApiErrorFromText(res.status, res.body ?? undefined)
    );
  }

  private tryRecoverAfterBook(
    err: unknown,
    tripId: number
  ): Observable<PassengerBookingDto> | null {
    if (!(err instanceof HttpErrorResponse)) return null;

    if (err.status >= 200 && err.status < 300) {
      const text = typeof err.error === 'string' ? err.error : null;
      const dto = text ? this.parseCreatedBooking(text, tripId) : null;
      if (dto) return of(dto);
      return this.fetchBookingAfterCreate(tripId);
    }

    if (
      (err.status === 200 || err.status === 201) &&
      (err.message?.includes('parsing') || err.message?.includes('JSON'))
    ) {
      return this.fetchBookingAfterCreate(tripId);
    }

    const msg = this.toApiError(err).message;
    if (
      (msg.includes('déjà') || msg.includes('inscrit')) &&
      tripId > 0
    ) {
      return this.fetchBookingAfterCreate(tripId);
    }

    return null;
  }

  private fetchBookingAfterCreate(tripId: number): Observable<PassengerBookingDto> {
    return this.getMyBookings().pipe(
      map(list => list.find(b => b.tripId === tripId)),
      switchMap(found => {
        if (found) return of(found);
        return throwError(() => ({
          message:
            'Réservation enregistrée. Ouvrez « Mes trajets » pour voir le détail.'
        }));
      })
    );
  }

  private parseCreatedBooking(
    body: string | null | undefined,
    tripId: number
  ): PassengerBookingDto | null {
    if (!body?.trim()) return null;
    try {
      const raw = JSON.parse(body) as Record<string, unknown>;
      if (raw['message'] && !raw['id']) return null;
      return this.ensureBookingShape(this.flattenBookingPayload(raw));
    } catch {
      return this.extractBookingFromText(body, tripId);
    }
  }

  private parseBookingList(body: string | null | undefined): PassengerBookingDto[] {
    if (!body?.trim()) return [];
    try {
      const parsed = JSON.parse(body);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .map((item: Record<string, unknown>) =>
          this.ensureBookingShape(this.flattenBookingPayload(item))
        )
        .filter(b => Number.isFinite(b.id) && b.id > 0);
    } catch {
      const one = this.extractBookingFromText(body, 0);
      return one ? [one] : [];
    }
  }

  /** Aplatit l'ancien format { id, trip: { departure, bookings: [...] } }. */
  private flattenBookingPayload(raw: Record<string, unknown>): PassengerBookingDto {
    const t = raw['trip'] as Record<string, unknown> | undefined;
    const driver = t?.['driver'] as Record<string, unknown> | undefined;
    const vehicle = t?.['vehicle'] as Record<string, unknown> | undefined;

    return {
      id: Number(raw['id']),
      tripId: Number(raw['tripId'] ?? t?.['id'] ?? 0) || undefined,
      seatsBooked: Number(raw['seatsBooked'] ?? 1),
      totalPrice: Number(raw['totalPrice'] ?? 0),
      status: String(raw['status'] ?? 'CONFIRMED'),
      createdAt: raw['createdAt'] as string | undefined,
      departure: (raw['departure'] ?? t?.['departure']) as string | undefined,
      destination: (raw['destination'] ?? t?.['destination']) as string | undefined,
      departureTime: (raw['departureTime'] ?? t?.['departureTime']) as string | undefined,
      driverId: (raw['driverId'] ?? driver?.['id']) as number | undefined,
      driverFirstName: (raw['driverFirstName'] ?? driver?.['firstName']) as string | undefined,
      driverLastName: (raw['driverLastName'] ?? driver?.['lastName']) as string | undefined,
      vehicleModel: (raw['vehicleModel'] ?? vehicle?.['model'] ?? vehicle?.['brand']) as
        | string
        | undefined
    };
  }

  /** Extraction minimale si JSON.parse échoue (réponse trop profonde). */
  private extractBookingFromText(
    body: string,
    tripId: number
  ): PassengerBookingDto | null {
    const idMatch = body.match(/"id"\s*:\s*(\d+)/);
    if (!idMatch) return null;
    const tripMatch = body.match(/"trip"\s*:\s*\{\s*"id"\s*:\s*(\d+)/);
    const depMatch = body.match(/"departure"\s*:\s*"([^"]+)"/);
    const destMatch = body.match(/"destination"\s*:\s*"([^"]+)"/);
    const priceMatch = body.match(/"totalPrice"\s*:\s*([\d.]+)/);
    const seatsMatch = body.match(/"seatsBooked"\s*:\s*(\d+)/);

    return this.ensureBookingShape({
      id: Number(idMatch[1]),
      tripId: tripMatch ? Number(tripMatch[1]) : tripId || undefined,
      departure: depMatch?.[1],
      destination: destMatch?.[1],
      totalPrice: priceMatch ? Number(priceMatch[1]) : 0,
      seatsBooked: seatsMatch ? Number(seatsMatch[1]) : 1,
      status: 'CONFIRMED'
    });
  }

  private ensureBookingShape(b: Partial<PassengerBookingDto>): PassengerBookingDto {
    return {
      ...b,
      id: Number(b.id),
      tripId: b.tripId != null ? Number(b.tripId) : undefined,
      seatsBooked: b.seatsBooked ?? 1,
      totalPrice: b.totalPrice ?? 0,
      status: b.status || 'CONFIRMED'
    } as PassengerBookingDto;
  }

  private toApiErrorFromText(status: number, body?: string): { message: string; status: number } {
    if (body) {
      try {
        const p = JSON.parse(body) as { message?: string };
        if (p.message) return { message: p.message, status };
      } catch {
        if (body.length < 300) return { message: body, status };
      }
    }
    return { message: 'Erreur serveur', status };
  }

  toApiError(err: unknown): { message: string; status?: number } {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string') {
        try {
          const p = JSON.parse(body);
          return { message: p.message || body, status: err.status };
        } catch {
          return { message: body, status: err.status };
        }
      }
      if (err.status === 0) {
        return {
          message: 'Impossible de joindre le serveur. Vérifiez que le backend tourne sur le port 8081.',
          status: 0
        };
      }
      return {
        message: body?.message || err.message || 'Erreur serveur',
        status: err.status
      };
    }
    if (err && typeof err === 'object' && 'message' in err) {
      return err as { message: string; status?: number };
    }
    return { message: 'Une erreur est survenue.' };
  }
}
