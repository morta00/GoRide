package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.Conversation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @EntityGraph(attributePaths = {"owner", "client", "vehicle"})
    @Query("SELECT c FROM Conversation c WHERE c.owner.id = :userId OR c.client.id = :userId ORDER BY c.createdAt DESC")
    List<Conversation> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Conversation c WHERE c.owner.id = :ownerId AND c.client.id = :clientId AND (c.vehicle.id = :vehicleId OR (:vehicleId IS NULL AND c.vehicle IS NULL)) AND (c.bookingId = :bookingId OR (:bookingId IS NULL AND c.bookingId IS NULL))")
    Optional<Conversation> findExistingConversation(@Param("ownerId") Long ownerId, @Param("clientId") Long clientId, @Param("vehicleId") Long vehicleId, @Param("bookingId") Long bookingId);

    List<Conversation> findByOwnerId(Long ownerId);
    List<Conversation> findByClientId(Long clientId);

    @Query("SELECT c FROM Conversation c WHERE c.owner.id = :driverId AND c.client.id = :passengerId " +
           "AND c.bookingId = :rideRequestId AND c.context IN ('RIDE', 'RIDE_REQUEST')")
    Optional<Conversation> findRideRequestConversation(
            @Param("driverId") Long driverId,
            @Param("passengerId") Long passengerId,
            @Param("rideRequestId") Long rideRequestId);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Conversation c " +
           "WHERE c.bookingId = :bookingId AND (c.owner.id = :userId OR c.client.id = :userId)")
    boolean existsByUserIdAndBookingId(@Param("userId") Long userId, @Param("bookingId") Long bookingId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM Conversation c WHERE c.vehicle.id = :vehicleId")
    void deleteByVehicleId(@org.springframework.data.repository.query.Param("vehicleId") Long vehicleId);
}
