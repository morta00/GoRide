package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entité représentant une conversation privée entre un propriétaire de flotte et un client.
 */
@Entity
@Table(name = "conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "roles", "password", "enabled", "createdAt", "resetToken", "resetTokenExpiration", "lastPasswordUpdate", "twoFactorSecret", "twoFactorTempSecret"})
    private UserEntity owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "roles", "password", "enabled", "createdAt", "resetToken", "resetTokenExpiration", "lastPasswordUpdate", "twoFactorSecret", "twoFactorTempSecret"})
    private UserEntity client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "owner", "driver"})
    private Vehicle vehicle;

    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "context")
    @Builder.Default
    private String context = "RENTAL_CLIENT"; // RENTAL_CLIENT, DRIVER_RENTAL, SUPPORT

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.List<Message> messages;
}
