package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.PlatformComplaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformComplaintRepository extends JpaRepository<PlatformComplaint, Long> {
    Optional<PlatformComplaint> findByCaseId(String caseId);
    List<PlatformComplaint> findByDemoMarker(String demoMarker);
    long countByStatusAndDemoMarker(String status, String demoMarker);
    long countByPriorityAndStatusNotInAndDemoMarker(String priority, List<String> statuses, String demoMarker);
}
