package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByUserIdOrderByCreatedAtDesc(Long userId);
}
