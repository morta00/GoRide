package com.pfeproject.GoRide.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientSettingsDTO {
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
