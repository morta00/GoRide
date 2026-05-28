package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.DriverProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, Long> {
    Optional<DriverProfile> findByUserId(Long userId);
}
