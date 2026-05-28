package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entité représentant une demande ou un contrat de location de véhicule.
 */
@Entity
@Table(name = "rental_contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    @JsonIgnoreProperties({"owner", "driver"})
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "renter_id", nullable = false)
    @JsonIgnoreProperties({"roles", "password", "enabled", "createdAt"})
    private UserEntity renter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnoreProperties({"roles", "password", "enabled", "createdAt"})
    private UserEntity owner;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "proposed_price")
    private Double proposedPrice;

    @Column(name = "driver_discount_percentage")
    @Builder.Default
    private Double driverDiscountPercentage = 0.0;

    @Column(name = "final_price")
    private Double finalPrice;

    @Column(name = "total_price")
    private Double totalPrice;

    @Column(name = "pickup_location")
    private String pickupLocation;

    @Column(name = "return_location")
    private String returnLocation;

    @Column(name = "payment_status", length = 20)
    @Builder.Default
    private String paymentStatus = "PENDING";

    @Enumerated(EnumType.STRING)
    @Column(length = 50, columnDefinition = "VARCHAR(50)")
    @Builder.Default
    private RentalStatus status = RentalStatus.PENDING;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(columnDefinition = "TEXT")
    private String clientNotes;

    @Column(name = "extension_requested_end_date")
    private LocalDate extensionRequestedEndDate;

    @Column(name = "extension_status", length = 20)
    private String extensionStatus; // PENDING, ACCEPTED, REJECTED

    @Column(name = "extension_price")
    private Double extensionPrice;
}
