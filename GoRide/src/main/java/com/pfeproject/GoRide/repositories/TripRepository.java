package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    // Tous les trajets d'un chauffeur
    List<Trip> findByDriverId(Long driverId);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.driver LEFT JOIN FETCH t.vehicle WHERE t.id = :id")
    java.util.Optional<Trip> findByIdWithDriver(@org.springframework.data.repository.query.Param("id") Long id);

    long countByStatus(String status);

    // Trajets disponibles (status AVAILABLE ou PUBLISHED et départ dans le futur)
    @Query("SELECT t FROM Trip t WHERE t.status IN ('AVAILABLE', 'PUBLISHED') AND t.availableSeats > 0 AND t.departureTime > :now ORDER BY t.departureTime ASC")
    List<Trip> findAvailableTrips(LocalDateTime now);

    // Trajets par lieu de départ et destination
    List<Trip> findByDepartureContainingIgnoreCaseAndDestinationContainingIgnoreCase(
            String departure, String destination);

    @Query("SELECT t FROM Trip t " +
           "LEFT JOIN FETCH t.driver " +
           "LEFT JOIN FETCH t.vehicle " +
           "WHERE t.status IN ('AVAILABLE', 'PUBLISHED') " +
           "AND t.availableSeats > 0 " +
           "AND t.departureTime > :now " +
           "ORDER BY t.departureTime ASC")
    List<Trip> findAvailableTripsWithDetails(@org.springframework.data.repository.query.Param("now") LocalDateTime now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM Trip t WHERE t.vehicle.id = :vehicleId")
    void deleteByVehicleId(@org.springframework.data.repository.query.Param("vehicleId") Long vehicleId);
}
