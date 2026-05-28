package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.PlatformReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformReportRepository extends JpaRepository<PlatformReport, Long> {
    Optional<PlatformReport> findByCaseId(String caseId);
    List<PlatformReport> findByDemoMarker(String demoMarker);
    long countByStatusAndDemoMarker(String status, String demoMarker);
}
