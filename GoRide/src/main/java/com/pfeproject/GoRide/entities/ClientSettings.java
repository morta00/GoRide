package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "client_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClientSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserEntity user;

    // Rental Preferences
    private String defaultPickupLocation;
    private String defaultReturnLocation;
    private String preferredVehicleType;
    private String preferredTransmission;
    private String preferredFuelType;
    private Double maxBudgetPerDay;
    private String preferredRentalDuration;
    private Boolean airConditioning;
    private Boolean gps;
    private Boolean babySeat;
    private Boolean largeTrunk;
    private Boolean unlimitedMileage;

    // Search Preferences
    private Boolean onlyAvailableVehicles;
    private Boolean sortByPrice;
    private Boolean proximitySearch;
    private Boolean bestRatedFirst;
    private Boolean insuranceIncluded;

    // Notifications
    private Boolean reservationNotifications;
    private Boolean returnReminderNotifications;
    private Boolean messageNotifications;
    private Boolean emailNotifications;

    // Privacy
    private Boolean allowLocation;
    private Boolean shareProfileWithOwners;
    private Boolean showFullName;
}
