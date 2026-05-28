import { Booking } from '../../models/trip.model';
import { PassengerBookingDto } from '../../services/trip.service';

/** Carte "Mes trajets" pour une réservation covoiturage. */
export interface SharedRideCard {
  id: number;
  bookingId: number;
  tripId?: number;
  sourceType: 'SHARED_RIDE';
  passengerId: string;
  passengerName: string;
  departure: string;
  destination: string;
  rideType: string;
  date: string;
  time: string;
  passengers: number;
  extras: string[];
  price: number;
  paymentMethod: string;
  driverId?: string;
  driverName?: string;
  driverRating?: number;
  vehicleName?: string;
  status: string;
  createdAt: string;
}

export function passengerBookingToRideCard(b: PassengerBookingDto | Booking): SharedRideCard {
  const depTime = b.departureTime ? new Date(b.departureTime) : null;
  const driverName = b.driverFirstName
    ? `${b.driverFirstName} ${b.driverLastName || ''}`.trim()
    : 'Chauffeur GoRide';

  return {
    id: Number(b.id),
    bookingId: Number(b.id),
    tripId: b.tripId != null ? Number(b.tripId) : undefined,
    sourceType: 'SHARED_RIDE',
    passengerId: '0',
    passengerName: 'Passager',
    departure: b.departure || 'Départ',
    destination: b.destination || 'Destination',
    rideType: 'SHARED',
    date: depTime && !isNaN(depTime.getTime()) ? depTime.toLocaleDateString('fr-FR') : '',
    time: depTime && !isNaN(depTime.getTime())
      ? depTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '',
    passengers: b.seatsBooked ?? 1,
    extras: [],
    price: b.totalPrice ?? 0,
    paymentMethod: 'Espèces',
    driverId: b.driverId != null ? String(b.driverId) : undefined,
    driverName,
    driverRating: 4.9,
    vehicleName: b.vehicleModel || 'Véhicule GoRide',
    status: b.status === 'PENDING_DRIVER' ? 'PENDING' : (b.status || 'CONFIRMED'),
    createdAt: b.createdAt || new Date().toISOString()
  };
}
