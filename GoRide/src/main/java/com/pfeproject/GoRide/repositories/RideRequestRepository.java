package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.RideRequest;
import com.pfeproject.GoRide.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {

    List<RideRequest> findByClientIdOrderByCreatedAtDesc(Long clientId);

    @Query("SELECT r FROM RideRequest r WHERE r.client.id = :clientId AND r.status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS') ORDER BY r.createdAt DESC")
    List<RideRequest> findCurrentRidesByClientId(Long clientId);

    List<RideRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<RideRequest> findByDriverIdOrderByCreatedAtDesc(Long driverId);
}
