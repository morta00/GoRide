package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.BookingDTO;
import com.pfeproject.GoRide.dto.PassengerBookingResponseDTO;
import com.pfeproject.GoRide.entities.Booking;
import com.pfeproject.GoRide.entities.Trip;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.BookingRepository;
import com.pfeproject.GoRide.repositories.TripRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Service métier pour la gestion des réservations.
 */
@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private NotificationService notificationService;

    /**
     * Réserve des places sur un trajet pour un passager.
     */
    @Transactional
    public PassengerBookingResponseDTO bookForPassenger(Long passengerId, BookingDTO dto) {
        Long bookingId = book(passengerId, dto).getId();
        return loadDto(bookingId);
    }

    private PassengerBookingResponseDTO loadDto(Long bookingId) {
        Booking b = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable."));
        return PassengerBookingResponseDTO.from(b);
    }

    @Transactional
    public Booking book(Long passengerId, BookingDTO dto) {
        Trip trip = tripRepository.findByIdWithDriver(dto.getTripId())
                .orElseThrow(() -> new RuntimeException("Trajet non trouvé avec l'id : " + dto.getTripId()));

        if (trip.getDriver() == null) {
            throw new RuntimeException("Ce trajet n'a pas de chauffeur assigné.");
        }

        if (trip.getDriver() != null && trip.getDriver().getId().equals(passengerId)) {
            throw new RuntimeException("Vous ne pouvez pas réserver votre propre trajet.");
        }

        int seats = dto.getSeatsBooked() != null ? dto.getSeatsBooked() : 1;
        if (seats < 1) {
            throw new RuntimeException("Au moins une place est requise.");
        }

        // Déjà inscrit → retourner la réservation existante (sans re-vérifier les places)
        Optional<Booking> pendingBooking = bookingRepository
                .findFirstByTripIdAndPassengerIdAndStatusOrderByCreatedAtDesc(
                        dto.getTripId(), passengerId, "PENDING_DRIVER");
        if (pendingBooking.isPresent()) {
            return bookingRepository.findByIdWithDetails(pendingBooking.get().getId())
                    .orElse(pendingBooking.get());
        }
        Optional<Booking> activeBooking = bookingRepository
                .findFirstByTripIdAndPassengerIdAndStatusOrderByCreatedAtDesc(
                        dto.getTripId(), passengerId, "CONFIRMED");
        if (activeBooking.isPresent()) {
            return bookingRepository.findByIdWithDetails(activeBooking.get().getId())
                    .orElse(activeBooking.get());
        }

        if ("FULL".equals(trip.getStatus())) {
            throw new RuntimeException("Ce trajet est complet. Plus de places disponibles.");
        }

        if (!"AVAILABLE".equals(trip.getStatus()) && !"PUBLISHED".equals(trip.getStatus())) {
            throw new RuntimeException("Ce trajet n'est plus disponible.");
        }

        int available = trip.getAvailableSeats() != null ? trip.getAvailableSeats() : 0;
        if (available < 1) {
            trip.setStatus("FULL");
            tripRepository.save(trip);
            throw new RuntimeException("Ce trajet est complet. Plus de places disponibles.");
        }

        if (available < seats) {
            throw new RuntimeException(
                    "Pas assez de places disponibles. Il reste " + available + " place(s).");
        }

        UserEntity passenger = userRepo.findById(passengerId)
                .orElseThrow(() -> new RuntimeException("Passager non trouvé avec l'id : " + passengerId));

        // Calculer le prix total
        double totalPrice = trip.getPricePerSeat() * seats;

        // Créer la réservation (en attente d'approbation chauffeur)
        Booking booking = Booking.builder()
                .trip(trip)
                .passenger(passenger)
                .seatsBooked(seats)
                .totalPrice(totalPrice)
                .status("PENDING_DRIVER")
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        savedBooking = bookingRepository.findByIdWithDetails(savedBooking.getId()).orElse(savedBooking);

        String route = trip.getDeparture() + " → " + trip.getDestination();

        notificationService.createNotification(
                passengerId,
                "Demande envoyée",
                "Votre demande pour le trajet " + route + " est en attente d'approbation du chauffeur.",
                "INFO",
                "/client/reservations?tripId=" + trip.getId() + "&bookingId=" + savedBooking.getId()
        );

        if (trip.getDriver() != null) {
            notificationService.createNotification(
                    trip.getDriver().getId(),
                    "Nouvelle demande covoiturage",
                    passenger.getFirstName() + " souhaite rejoindre votre trajet " + route
                            + " (" + seats + " place(s)).",
                    "INFO",
                    "/driver/requests?bookingId=" + savedBooking.getId() + "&openDetails=1"
            );
        }

        return savedBooking;
    }

    @Transactional(readOnly = true)
    public List<PassengerBookingResponseDTO> getDriverInboxBookings(Long driverId) {
        List<Trip> trips = tripRepository.findByDriverId(driverId);
        if (trips.isEmpty()) {
            System.out.println("[BookingService] Aucun trajet pour chauffeur id=" + driverId);
            return List.of();
        }

        Set<String> allowed = Set.of("PENDING_DRIVER", "CONFIRMED", "CANCELLED");
        List<Booking> collected = new ArrayList<>();
        for (Trip trip : trips) {
            for (Booking b : bookingRepository.findByTripId(trip.getId())) {
                if (b.getStatus() == null) continue;
                String st = b.getStatus().trim().toUpperCase();
                if (allowed.contains(st)) {
                    collected.add(b);
                }
            }
        }

        collected.sort((a, b) -> {
            var ca = a.getCreatedAt() != null ? a.getCreatedAt() : java.time.LocalDateTime.MIN;
            var cb = b.getCreatedAt() != null ? b.getCreatedAt() : java.time.LocalDateTime.MIN;
            return cb.compareTo(ca);
        });

        List<PassengerBookingResponseDTO> result = new ArrayList<>();
        for (Booking b : collected) {
            result.add(loadDto(b.getId()));
        }

        System.out.println("[BookingService] Inbox chauffeur id=" + driverId
                + " trajets=" + trips.size() + " réservations=" + result.size());
        return result;
    }

    @Transactional
    public PassengerBookingResponseDTO driverAcceptBooking(Long bookingId, Long driverId) {
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable."));
        Trip trip = booking.getTrip();
        if (trip.getDriver() == null || !trip.getDriver().getId().equals(driverId)) {
            throw new SecurityException("Vous n'êtes pas le chauffeur de ce trajet.");
        }
        if ("CONFIRMED".equals(booking.getStatus())) {
            return PassengerBookingResponseDTO.from(booking);
        }
        if (!"PENDING_DRIVER".equals(booking.getStatus())) {
            throw new RuntimeException("Cette demande n'est plus en attente.");
        }

        int seats = booking.getSeatsBooked() != null ? booking.getSeatsBooked() : 1;
        int available = trip.getAvailableSeats() != null ? trip.getAvailableSeats() : 0;
        if (available < seats) {
            throw new RuntimeException("Pas assez de places disponibles sur ce trajet.");
        }

        trip.setAvailableSeats(available - seats);
        if (trip.getAvailableSeats() == 0) {
            trip.setStatus("FULL");
        }
        tripRepository.save(trip);

        booking.setStatus("CONFIRMED");
        bookingRepository.save(booking);

        UserEntity passenger = booking.getPassenger();
        if (passenger != null) {
            notificationService.createNotification(
                    passenger.getId(),
                    "Réservation acceptée",
                    "Le chauffeur a accepté votre place sur le trajet "
                            + trip.getDeparture() + " → " + trip.getDestination() + ".",
                    "SUCCESS",
                    "/client/reservations?tripId=" + trip.getId() + "&bookingId=" + booking.getId()
            );
        }

        return PassengerBookingResponseDTO.from(booking);
    }

    @Transactional
    public void driverRejectBooking(Long bookingId, Long driverId) {
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable."));
        Trip trip = booking.getTrip();
        if (trip.getDriver() == null || !trip.getDriver().getId().equals(driverId)) {
            throw new SecurityException("Vous n'êtes pas le chauffeur de ce trajet.");
        }
        if ("CANCELLED".equals(booking.getStatus())) {
            return;
        }

        if ("CONFIRMED".equals(booking.getStatus())) {
            restoreSeatsAndCancel(booking, trip);
        } else if ("PENDING_DRIVER".equals(booking.getStatus())) {
            booking.setStatus("CANCELLED");
            bookingRepository.save(booking);
        } else {
            throw new RuntimeException("Cette demande ne peut plus être refusée.");
        }

        UserEntity passenger = booking.getPassenger();
        if (passenger != null) {
            notificationService.createNotification(
                    passenger.getId(),
                    "Demande refusée",
                    "Le chauffeur a refusé votre demande pour le trajet "
                            + trip.getDeparture() + " → " + trip.getDestination() + ".",
                    "WARNING",
                    "/client/reservations"
            );
        }
    }

    private void restoreSeatsAndCancel(Booking booking, Trip trip) {
        int restored = (trip.getAvailableSeats() != null ? trip.getAvailableSeats() : 0)
                + (booking.getSeatsBooked() != null ? booking.getSeatsBooked() : 0);
        trip.setAvailableSeats(restored);
        if ("FULL".equals(trip.getStatus()) && restored > 0) {
            trip.setStatus("PUBLISHED");
        }
        tripRepository.save(trip);
        booking.setStatus("CANCELLED");
        bookingRepository.save(booking);
    }

    /**
     * Annule la réservation confirmée du passager sur un trajet (si l'id réservation est inconnu côté client).
     */
    @Transactional
    public void cancelBookingByTrip(Long tripId, Long passengerId) {
        Booking booking = bookingRepository
                .findFirstByTripIdAndPassengerIdAndStatusOrderByCreatedAtDesc(tripId, passengerId, "CONFIRMED")
                .orElseThrow(() -> new RuntimeException(
                        "Aucune réservation active trouvée pour ce trajet."));
        cancelBooking(booking.getId(), passengerId);
    }

    /**
     * Annule une réservation (par le passager).
     */
    @Transactional
    public void cancelBooking(Long bookingId, Long passengerId) {
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée avec l'id : " + bookingId));

        if (!booking.getPassenger().getId().equals(passengerId)) {
            throw new SecurityException("Vous n'êtes pas le propriétaire de cette réservation.");
        }

        if ("CANCELLED".equals(booking.getStatus())) {
            throw new RuntimeException("Cette réservation est déjà annulée.");
        }

        // Remettre les places disponibles sur le trajet
        Trip trip = booking.getTrip();
        int restored = trip.getAvailableSeats() + booking.getSeatsBooked();
        trip.setAvailableSeats(restored);
        if ("FULL".equals(trip.getStatus()) && restored > 0) {
            trip.setStatus("PUBLISHED");
        }
        tripRepository.save(trip);

        booking.setStatus("CANCELLED");
        bookingRepository.save(booking);

        // --- Notification pour le chauffeur ---
        notificationService.createNotification(
                trip.getDriver().getId(),
                "Réservation annulée",
                booking.getPassenger().getFirstName() + " a annulé sa réservation pour votre trajet vers " + trip.getDestination() + ".",
                "WARNING",
                "/driver/trips"
        );
    }

    /**
     * Retourne toutes les réservations d'un passager.
     */
    @Transactional(readOnly = true)
    public List<PassengerBookingResponseDTO> getBookingsByUser(Long userId) {
        return bookingRepository.findActiveByPassengerId(userId).stream()
                .map(PassengerBookingResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PassengerBookingResponseDTO> getBookingsByTrip(Long tripId) {
        return bookingRepository.findByTripId(tripId).stream()
                .filter(b -> !"CANCELLED".equals(b.getStatus()))
                .map(PassengerBookingResponseDTO::from)
                .toList();
    }
}
