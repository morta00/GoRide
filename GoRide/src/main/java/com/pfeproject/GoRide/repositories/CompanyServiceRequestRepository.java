package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.CompanyServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompanyServiceRequestRepository extends JpaRepository<CompanyServiceRequest, Long> {
    List<CompanyServiceRequest> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<CompanyServiceRequest> findByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, String status);

    @Query("""
            SELECT c FROM CompanyServiceRequest c
            WHERE c.type = 'VEHICLE_RENTAL'
              AND c.vehicleId IN (SELECT v.id FROM Vehicle v WHERE v.owner.id = :ownerId)
            ORDER BY c.createdAt DESC
            """)
    List<CompanyServiceRequest> findVehicleRentalRequestsForOwner(@Param("ownerId") Long ownerId);
}
