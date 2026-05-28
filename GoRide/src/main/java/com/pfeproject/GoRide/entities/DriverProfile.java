package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "driver_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DriverProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserEntity user;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    @Column(name = "driving_experience_years")
    private Integer drivingExperienceYears;

    @Column(name = "availability_status")
    @Builder.Default
    private String availabilityStatus = "AVAILABLE"; // AVAILABLE, BUSY, OFFLINE

    @Column(name = "work_mode")
    private String workMode; // INDEPENDENT, COMPANY

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "rating")
    @Builder.Default
    private Double rating = 5.0;

    @Column(name = "total_trips")
    @Builder.Default
    private Integer totalTrips = 0;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
