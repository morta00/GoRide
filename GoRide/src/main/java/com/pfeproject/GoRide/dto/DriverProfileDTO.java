package com.pfeproject.GoRide.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DriverProfileDTO {
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String city;
    private String address;
    private String country;
    private String preferredLanguage;
    private String role;
    private String verificationStatus;
    
    // Driver specific fields
    private String licenseNumber;
    private Integer drivingExperienceYears;
    private String availabilityStatus;
    private String workMode;
    private String bio;
    private Double rating;
    private Integer totalTrips;
}
