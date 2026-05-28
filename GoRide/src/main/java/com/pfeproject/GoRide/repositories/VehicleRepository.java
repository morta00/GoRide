package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.entities.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    @Query("SELECT v FROM Vehicle v WHERE v.owner.id = :ownerId")
    List<Vehicle> findByOwnerId(@Param("ownerId") Long ownerId);

    List<Vehicle> findByOwner(UserEntity owner);

    List<Vehicle> findByDriverId(Long driverId);

    List<Vehicle> findByAvailableTrue();

    List<Vehicle> findByAvailableTrueAndStatus(VehicleStatus status);

    long countByAvailableTrueAndStatus(VehicleStatus status);

    boolean existsByLicensePlate(String licensePlate);

    java.util.Optional<Vehicle> findByLicensePlate(String licensePlate);

    long countByOwnerId(Long ownerId);

    long countByOwner(UserEntity owner);

    long countByOwnerIdAndStatus(Long ownerId, VehicleStatus status);

    @Query(value = "SELECT v.* FROM vehicles v " +
                   "JOIN users owner ON owner.id = v.owner_id " +
                   "JOIN user_roles ur ON ur.user_id = owner.id " +
                   "JOIN roles r ON r.id = ur.role_id " +
                   "WHERE r.name = 'ROLE_FLEET_OWNER' " +
                   "AND v.status = 'AVAILABLE' " +
                   "AND v.owner_id <> :driverId " +
                   "AND (v.driver_id IS NULL OR v.driver_id <> :driverId)", 
           nativeQuery = true)
    List<Vehicle> findAvailablePartnerVehicles(@Param("driverId") Long driverId);
}
