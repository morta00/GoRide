package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByReservationId(Long reservationId);
    java.util.List<Review> findByClientId(Long clientId);
    java.util.List<Review> findByOwnerId(Long ownerId);
    java.util.List<Review> findByVehicle_Driver_IdOrderByCreatedAtDesc(Long driverId);

    java.util.List<Review> findByDriver_IdOrderByCreatedAtDesc(Long driverId);
}
