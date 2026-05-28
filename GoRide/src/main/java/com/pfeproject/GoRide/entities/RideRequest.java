package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ride_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RideRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "roles", "password", "photoUrl", "phone", "address", "gender", "language", "city", "birthDate", "lastPasswordUpdate", "theme", "twoFactorEnabled", "enabled", "createdAt", "resetToken", "resetTokenExpiration", "twoFactorSecret", "twoFactorTempSecret"})
    private UserEntity client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "roles", "password", "photoUrl", "phone", "address", "gender", "language", "city", "birthDate", "lastPasswordUpdate", "theme", "twoFactorEnabled", "enabled", "createdAt", "resetToken", "resetTokenExpiration", "twoFactorSecret", "twoFactorTempSecret"})
    private UserEntity driver;

    @Column(nullable = false)
    private String departure;

    @Column(nullable = false)
    private String destination;

    @Column(name = "ride_type", nullable = false)
    private String rideType; // INDIVIDUAL, COLLABORATIVE

    private Integer passengers;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(length = 500)
    private String comment;

    @Column(name = "estimated_price")
    private Double estimatedPrice;

    @Column(nullable = false)
    private String status; // PENDING, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
