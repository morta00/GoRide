package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.PlatformFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlatformFeedbackRepository extends JpaRepository<PlatformFeedback, Long> {
    List<PlatformFeedback> findByClientIdOrderByCreatedAtDesc(Long clientId);
}
