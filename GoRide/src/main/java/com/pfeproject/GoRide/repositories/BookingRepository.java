package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.Booking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    @org.springframework.data.jpa.repository.Query(
            "SELECT b FROM Booking b " +
            "LEFT JOIN FETCH b.trip t " +
            "LEFT JOIN FETCH t.driver " +
            "LEFT JOIN FETCH t.vehicle " +
            "LEFT JOIN FETCH b.passenger " +
            "WHERE b.id = :id")
    Optional<Booking> findByIdWithDetails(@org.springframework.data.repository.query.Param("id") Long id);

    // Réservations actives d'un passager (trip + chauffeur chargés), plus récentes d'abord
    @EntityGraph(attributePaths = {"trip", "trip.driver", "trip.vehicle"})
    @org.springframework.data.jpa.repository.Query(
            "SELECT b FROM Booking b WHERE b.passenger.id = :passengerId AND b.status <> 'CANCELLED' " +
            "ORDER BY b.createdAt DESC")
    List<Booking> findActiveByPassengerId(@org.springframework.data.repository.query.Param("passengerId") Long passengerId);

    // Réservations d'un passager (trip + chauffeur chargés)
    @EntityGraph(attributePaths = {"trip", "trip.driver", "trip.vehicle"})
    List<Booking> findByPassengerId(Long passengerId);

    // Réservations pour un trajet
    List<Booking> findByTripId(Long tripId);

    // Réservation active (confirmée) pour un passager sur un trajet
    boolean existsByTripIdAndPassengerIdAndStatus(Long tripId, Long passengerId, String status);

    @EntityGraph(attributePaths = {"trip", "trip.driver", "trip.vehicle"})
    java.util.Optional<Booking> findFirstByTripIdAndPassengerIdAndStatusOrderByCreatedAtDesc(
            Long tripId, Long passengerId, String status);

    /**
     * Toutes les demandes / réservations covoiturage pour les trajets du chauffeur connecté.
     * (en attente, confirmées, refusées/annulées)
     */
    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT b FROM Booking b " +
            "INNER JOIN FETCH b.trip t " +
            "INNER JOIN FETCH t.driver d " +
            "LEFT JOIN FETCH t.vehicle " +
            "LEFT JOIN FETCH b.passenger " +
            "WHERE d.id = :driverId " +
            "AND b.status IN ('PENDING_DRIVER', 'CONFIRMED', 'CANCELLED') " +
            "ORDER BY b.createdAt DESC")
    List<Booking> findDriverInboxBookings(@org.springframework.data.repository.query.Param("driverId") Long driverId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT b FROM Booking b " +
            "INNER JOIN FETCH b.trip t " +
            "INNER JOIN FETCH t.driver " +
            "LEFT JOIN FETCH b.passenger " +
            "LEFT JOIN FETCH t.vehicle " +
            "WHERE t.id IN :tripIds AND b.status IN :statuses " +
            "ORDER BY b.createdAt DESC")
    List<Booking> findByTripIdsAndStatuses(
            @org.springframework.data.repository.query.Param("tripIds") List<Long> tripIds,
            @org.springframework.data.repository.query.Param("statuses") List<String> statuses);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM Booking b WHERE b.trip.vehicle.id = :vehicleId")
    void deleteByTripVehicleId(@org.springframework.data.repository.query.Param("vehicleId") Long vehicleId);
}
