package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.entities.Activity;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ActivityService {

    @Autowired
    private ActivityRepository activityRepository;

    /**
     * Log a new activity for a user.
     */
    public void logActivity(UserEntity user, String title, String description, String type, String category) {
        Activity activity = Activity.builder()
                .user(user)
                .title(title)
                .description(description)
                .type(type)
                .category(category)
                .createdAt(LocalDateTime.now())
                .build();
        activityRepository.save(activity);
    }

    /**
     * Get the last 5 activities for a user.
     */
    public java.util.List<com.pfeproject.GoRide.dto.RecentActivityDTO> getRecentActivities(Long userId) {
        return activityRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .limit(5)
                .map(a -> new com.pfeproject.GoRide.dto.RecentActivityDTO(
                        a.getTitle(),
                        a.getDescription(),
                        a.getType(),
                        a.getCategory(),
                        a.getCreatedAt()
                ))
                .collect(java.util.stream.Collectors.toList());
    }
}
