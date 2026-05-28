package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    Optional<SupportTicket> findByCaseId(String caseId);
    List<SupportTicket> findByDemoMarker(String demoMarker);
    long countByStatusAndDemoMarker(String status, String demoMarker);
}
