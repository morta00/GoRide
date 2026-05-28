package com.pfeproject.GoRide.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateDriverProfileRequest {
    private String firstName;
    private String lastName;
    private String phone;
    private String city;
    private String address;
    private String country;
    private String preferredLanguage;
    
    // Driver specific fields
    private String licenseNumber;
    private Integer drivingExperienceYears;
    private String availabilityStatus;
    private String workMode;
    private String bio;
}
