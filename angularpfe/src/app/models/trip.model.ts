

export interface Trip {
  id?: number;
  departure: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  notes?: string;
  status: string; // AVAILABLE, FULL, CANCELLED, COMPLETED
  driver?: any;
  vehicle?: any;
}

export interface Booking {
  id?: number;
  trip?: Trip;
  passenger?: any;
  seatsBooked: number;
  totalPrice: number;
  status: string; // CONFIRMED, CANCELLED
  createdAt?: string;
  /** Flat fields from GET /api/bookings/me */
  tripId?: number;
  departure?: string;
  destination?: string;
  departureTime?: string;
  driverId?: number;
  driverFirstName?: string;
  driverLastName?: string;
  vehicleModel?: string;
}

export interface TripDTO {
  departure: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  pricePerSeat: number;
  notes?: string;
  vehicleId?: number;
}

export interface BookingDTO {
  tripId: number;
  seatsBooked: number;
}
