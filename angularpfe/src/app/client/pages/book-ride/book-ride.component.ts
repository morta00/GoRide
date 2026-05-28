import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TripService } from '../../../services/trip.service';
import { catchError, forkJoin, of } from 'rxjs';
import { BookingDTO, Booking } from '../../../models/trip.model';
import { AiRecommendation } from '../../../services/ai-recommendation.service';

interface Trip {
  id: string;
  departureCity: string;
  departureAddress: string;
  arrivalCity: string;
  arrivalAddress: string;
  date: string;
  time: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverTripsCount: number;
  vehicleName: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  luggageAllowed: boolean;
  petsAllowed: boolean;
  comment?: string;
  status: string;
}

interface UserTripBooking {
  bookingId: number;
  tripId: number;
  status: string;
  seatsBooked: number;
}

@Component({
  selector: 'app-book-ride',
  templateUrl: './book-ride.component.html',
  styleUrls: ['./book-ride.component.css']
})
export class BookRideComponent implements OnInit {
  readonly paymentCash = 'Esp\u00e8ces';
  readonly paymentCard = 'Carte';

  allTrips: Trip[] = [];
  filteredTrips: Trip[] = [];
  successMessage = false;

  searchQuery = '';
  sortBy = 'recent';
  filters = {
    date: 'all',
    price: 'all',
    seats: '1',
    luggage: false,
    pets: false
  };

  showDetailsModal = false;
  showBookingModal = false;
  selectedTrip: Trip | null = null;
  bookingSeats = 1;
  paymentMethod = this.paymentCash;
  private focusTripId: string | null = null;
  private myBookingsByTripId = new Map<number, UserTripBooking>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private tripService: TripService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.focusTripId = params['tripId'] ? String(params['tripId']) : null;
      this.loadTrips();
    });
  }

  loadTrips(): void {
    forkJoin({
      trips: this.tripService.getAvailableTrips().pipe(catchError(() => of([]))),
      bookings: this.tripService.getMyBookings().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ trips: res, bookings }) => {
        this.syncMyBookings(bookings);
        let trips = (res || []).map(t => this.normalizeTrip(t));
        if (!this.focusTripId) {
          trips = trips.filter(
            t => (t.availableSeats > 0 && t.status !== 'FULL') || this.hasActiveBooking(t)
          );
        }
        this.allTrips = trips;
        this.applyFilters();
        if (this.focusTripId) {
          this.ensureFocusedTripVisible();
        }
      },
      error: (err) => {
        console.error('Erreur de chargement des trajets', err);
        this.allTrips = [];
        this.applyFilters();
      }
    });
  }

  private syncMyBookings(bookings: any[]): void {
    this.myBookingsByTripId.clear();
    (bookings || []).forEach(b => {
      const tripId = b.tripId != null ? Number(b.tripId) : NaN;
      const status = String(b.status || 'CONFIRMED');
      if (!Number.isFinite(tripId) || status === 'CANCELLED') return;
      this.myBookingsByTripId.set(tripId, {
        bookingId: Number(b.id),
        tripId,
        status,
        seatsBooked: b.seatsBooked ?? 1
      });
    });
  }

  getBookingForTrip(trip: Trip | null): UserTripBooking | null {
    if (!trip) return null;
    return this.myBookingsByTripId.get(Number(trip.id)) ?? null;
  }

  hasActiveBooking(trip: Trip | null): boolean {
    return !!this.getBookingForTrip(trip);
  }

  isPendingDriverApproval(trip: Trip | null): boolean {
    return this.getBookingForTrip(trip)?.status === 'PENDING_DRIVER';
  }

  goToMyReservation(trip: Trip | null): void {
    if (!trip) return;
    const b = this.getBookingForTrip(trip);
    this.closeDetails();
    this.closeBooking();
    this.router.navigate(['/client/reservations'], {
      queryParams: {
        tripId: trip.id,
        ...(b?.bookingId ? { bookingId: b.bookingId } : {})
      }
    });
  }

  onAiTripRecommended(rec: AiRecommendation): void {
    if (!rec.recommendedId) return;
    const trip = this.filteredTrips.find(t => Number(t.id) === rec.recommendedId)
      ?? this.allTrips.find(t => Number(t.id) === rec.recommendedId);
    if (trip) {
      this.openDetails(trip);
      setTimeout(() => {
        document.getElementById('ai-target-' + rec.recommendedId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }

  private ensureFocusedTripVisible(): void {
    if (!this.focusTripId) return;
    const existing = this.allTrips.find(t => t.id === this.focusTripId);
    if (existing) {
      setTimeout(() => this.openDetails(existing), 150);
      return;
    }
    const tripIdNum = Number(this.focusTripId);
    if (!Number.isFinite(tripIdNum)) return;

    this.tripService.getTripById(tripIdNum).pipe(
      catchError(() => of(null))
    ).subscribe(trip => {
      if (!trip) {
        this.router.navigate(['/client/reservations'], {
          queryParams: { tripId: this.focusTripId }
        });
        return;
      }
      const normalized = this.normalizeTrip(trip);
      this.allTrips = [normalized, ...this.allTrips.filter(t => t.id !== normalized.id)];
      this.applyFilters();
      setTimeout(() => this.openDetails(normalized), 150);
    });
  }

  normalizeTrip(t: any): Trip {
    const depTime = t.departureTime ? new Date(t.departureTime) : new Date();
    const dateStr = depTime.toISOString().split('T')[0];
    const timeStr = depTime.toTimeString().split(' ')[0].substring(0, 5);

    return {
      id: String(t.id),
      departureCity: t.departure || 'Ville inconnue',
      departureAddress: t.notes || 'Adresse non sp\u00e9cifi\u00e9e',
      arrivalCity: t.destination || 'Destination inconnue',
      arrivalAddress: t.notes || 'Adresse non sp\u00e9cifi\u00e9e',
      date: dateStr,
      time: timeStr,
      driverId: String(t.driverId || ''),
      driverName: t.driverName || 'Chauffeur GoRide',
      driverRating: t.driverRating || 4.5,
      driverTripsCount: 20,
      vehicleName: t.vehicleName || 'V\u00e9hicule standard',
      availableSeats: t.availableSeats || 0,
      totalSeats: 4,
      pricePerSeat: t.pricePerSeat || 0,
      luggageAllowed: true,
      petsAllowed: false,
      comment: t.notes || '',
      status: t.status || 'PUBLISHED'
    };
  }

  applyFilters(): void {
    let result = [...this.allTrips];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.departureCity || '').toLowerCase().includes(q) ||
        (t.arrivalCity || '').toLowerCase().includes(q) ||
        (t.departureAddress || '').toLowerCase().includes(q) ||
        (t.arrivalAddress || '').toLowerCase().includes(q) ||
        (t.driverName || '').toLowerCase().includes(q) ||
        (t.vehicleName || '').toLowerCase().includes(q) ||
        (t.comment || '').toLowerCase().includes(q)
      );
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const nextWeekStr = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

    if (this.filters.date !== 'all') {
      result = result.filter(t => {
        if (this.filters.date === 'today') return t.date === todayStr;
        if (this.filters.date === 'tomorrow') return t.date === tomorrowStr;
        if (this.filters.date === 'week') return t.date >= todayStr && t.date <= nextWeekStr;
        return true;
      });
    }

    if (this.filters.price !== 'all') {
      result = result.filter(t => {
        if (this.filters.price === 'under10') return t.pricePerSeat < 10;
        if (this.filters.price === '10to20') return t.pricePerSeat >= 10 && t.pricePerSeat <= 20;
        if (this.filters.price === 'above20') return t.pricePerSeat > 20;
        return true;
      });
    }

    const minSeats = parseInt(this.filters.seats, 10);
    result = result.filter(t => t.availableSeats >= minSeats || this.hasActiveBooking(t));

    if (this.filters.luggage) result = result.filter(t => t.luggageAllowed);
    if (this.filters.pets) result = result.filter(t => t.petsAllowed);

    this.sortTrips(result);
    this.filteredTrips = result;
  }

  sortTrips(list: Trip[]): void {
    switch (this.sortBy) {
      case 'recent':
        list.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'price-asc':
        list.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
        break;
      case 'price-desc':
        list.sort((a, b) => b.pricePerSeat - a.pricePerSeat);
        break;
      case 'rating':
        list.sort((a, b) => b.driverRating - a.driverRating);
        break;
      case 'soon':
        list.sort((a, b) => {
          const dateTimeA = (a.date || '') + (a.time || '');
          const dateTimeB = (b.date || '') + (b.time || '');
          return dateTimeA.localeCompare(dateTimeB);
        });
        break;
    }
  }

  toggleFilter(key: 'luggage' | 'pets'): void {
    (this.filters as any)[key] = !(this.filters as any)[key];
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filters = {
      date: 'all',
      price: 'all',
      seats: '1',
      luggage: false,
      pets: false
    };
    this.sortBy = 'recent';
    this.applyFilters();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today) return "Aujourd'hui";
    if (dateStr === tomorrow) return 'Demain';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  openDetails(t: Trip): void {
    this.selectedTrip = t;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
  }

  openBooking(t: Trip): void {
    if (this.hasActiveBooking(t)) {
      this.goToMyReservation(t);
      return;
    }
    this.selectedTrip = t;
    this.bookingSeats = 1;
    this.paymentMethod = this.paymentCash;
    this.showBookingModal = true;
    this.showDetailsModal = false;
  }

  closeBooking(): void {
    this.showBookingModal = false;
  }

  changeSeats(delta: number): void {
    if (!this.selectedTrip) return;
    const newVal = this.bookingSeats + delta;
    if (newVal >= 1 && newVal <= this.selectedTrip.availableSeats) {
      this.bookingSeats = newVal;
    }
  }

  confirmBooking(): void {
    if (!this.selectedTrip) return;

    const bookingData: BookingDTO = {
      tripId: Number(this.selectedTrip.id),
      seatsBooked: this.bookingSeats
    };

    this.tripService.bookTrip(bookingData).subscribe({
      next: (booking) => {
        this.showBookingModal = false;
        const trip = this.selectedTrip;
        const tripId = Number(trip?.id);
        if (Number.isFinite(tripId)) {
          this.myBookingsByTripId.set(tripId, {
            bookingId: Number(booking.id),
            tripId,
            status: booking.status || 'PENDING_DRIVER',
            seatsBooked: booking.seatsBooked ?? this.bookingSeats
          });
        }
        const payload: Booking = {
          ...booking,
          tripId: booking.tripId ?? Number(trip?.id),
          departure: booking.departure || trip?.departureCity || '',
          destination: booking.destination || trip?.arrivalCity || '',
          departureTime: booking.departureTime ||
            (trip?.date && trip?.time ? `${trip.date}T${trip.time}:00` : undefined),
          vehicleModel: booking.vehicleModel || trip?.vehicleName,
          seatsBooked: booking.seatsBooked ?? this.bookingSeats,
          totalPrice: booking.totalPrice ?? (trip ? trip.pricePerSeat * this.bookingSeats : 0),
          status: 'CONFIRMED'
        };
        this.router.navigate(['/client/reservations'], {
          queryParams: { sharedBooked: '1' },
          state: { newBooking: payload }
        });
      },
      error: (err) => {
        const msg = this.tripService.toApiError(err).message;
        if (msg.includes('enregistr\u00e9e') || msg.includes('Mes trajets') || msg.includes('d\u00e9j\u00e0') || msg.includes('inscrit')) {
          this.tripService.getMyBookings().subscribe(bookings => {
            this.syncMyBookings(bookings);
            if (this.selectedTrip) {
              this.goToMyReservation(this.selectedTrip);
            } else {
              this.router.navigate(['/client/reservations'], { queryParams: { sharedBooked: '1' } });
            }
          });
          return;
        }
        alert(msg);
      }
    });
  }
}
