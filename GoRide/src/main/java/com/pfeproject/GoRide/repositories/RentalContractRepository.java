package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.RentalContract;
import com.pfeproject.GoRide.entities.RentalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RentalContractRepository extends JpaRepository<RentalContract, Long> {
    List<RentalContract> findByOwnerId(Long ownerId);
    List<RentalContract> findByRenterId(Long renterId);

    @Query("SELECT r FROM RentalContract r " +
           "JOIN FETCH r.vehicle " +
           "JOIN FETCH r.owner " +
           "JOIN FETCH r.renter " +
           "WHERE r.renter.id = :renterId " +
           "ORDER BY r.createdAt DESC")
    List<RentalContract> findByRenterIdWithDetails(@Param("renterId") Long renterId);

    @Query("SELECT r FROM RentalContract r " +
           "JOIN FETCH r.vehicle " +
           "JOIN FETCH r.owner " +
           "JOIN FETCH r.renter " +
           "WHERE r.owner.id = :ownerId " +
           "ORDER BY r.createdAt DESC")
    List<RentalContract> findByOwnerIdWithDetailsForList(@Param("ownerId") Long ownerId);
    List<RentalContract> findByVehicleId(Long vehicleId);

    long countByOwnerIdAndStatus(Long ownerId, RentalStatus status);

    long countByRenterIdAndStatus(Long renterId, RentalStatus status);

    List<RentalContract> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @Query("SELECT COALESCE(SUM(r.finalPrice), 0) FROM RentalContract r " +
           "WHERE r.owner.id = :ownerId AND r.status = com.pfeproject.GoRide.entities.RentalStatus.ACCEPTED " +
           "AND r.createdAt >= :startOfMonth")
    Double sumRevenueByOwnerSince(@Param("ownerId") Long ownerId,
                                   @Param("startOfMonth") LocalDateTime startOfMonth);

    long countByVehicleIdAndStatus(Long vehicleId, RentalStatus status);

    @Query("SELECT COALESCE(SUM(r.finalPrice), 0) FROM RentalContract r " +
           "WHERE r.vehicle.id = :vehicleId AND r.status = com.pfeproject.GoRide.entities.RentalStatus.ACCEPTED")
    Double sumRevenueByVehicleId(@Param("vehicleId") Long vehicleId);

    /**
     * Requête optimisée pour le calendrier.
     * JOIN FETCH charge vehicle + renter en un seul SQL → évite N+1 et LazyInitializationException.
     * Triée par startDate pour un affichage chronologique.
     */
    @Query("SELECT r FROM RentalContract r " +
           "JOIN FETCH r.vehicle " +
           "JOIN FETCH r.renter " +
           "WHERE r.owner.id = :ownerId " +
           "ORDER BY r.startDate ASC")
    List<RentalContract> findByOwnerIdWithDetails(@Param("ownerId") Long ownerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM RentalContract r WHERE r.vehicle.id = :vehicleId")
    void deleteByVehicleId(@org.springframework.data.repository.query.Param("vehicleId") Long vehicleId);
}
