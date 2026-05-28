package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.DriverProfileDTO;
import com.pfeproject.GoRide.dto.UpdateDriverProfileRequest;
import com.pfeproject.GoRide.entities.DriverProfile;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.DriverProfileRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class DriverProfileService {

    @Autowired
    private DriverProfileRepository driverProfileRepository;

    @Autowired
    private UserRepo userRepository;

    public DriverProfileDTO getDriverProfile(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    DriverProfile newProfile = DriverProfile.builder()
                            .user(user)
                            .availabilityStatus("AVAILABLE")
                            .rating(5.0)
                            .totalTrips(0)
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return driverProfileRepository.save(newProfile);
                });

        return mapToDTO(user, profile);
    }

    @Transactional
    public DriverProfileDTO updateDriverProfile(Long userId, UpdateDriverProfileRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseGet(() -> DriverProfile.builder().user(user).build());

        // Update User fields
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getCity() != null) user.setCity(request.getCity());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getCountry() != null) user.setCountry(request.getCountry());
        if (request.getPreferredLanguage() != null) user.setLanguage(request.getPreferredLanguage());
        userRepository.save(user);

        // Update DriverProfile fields
        if (request.getLicenseNumber() != null) profile.setLicenseNumber(request.getLicenseNumber());
        if (request.getDrivingExperienceYears() != null) profile.setDrivingExperienceYears(request.getDrivingExperienceYears());
        if (request.getAvailabilityStatus() != null) profile.setAvailabilityStatus(request.getAvailabilityStatus());
        if (request.getWorkMode() != null) profile.setWorkMode(request.getWorkMode());
        if (request.getBio() != null) profile.setBio(request.getBio());
        profile.setUpdatedAt(LocalDateTime.now());
        
        driverProfileRepository.save(profile);

        return mapToDTO(user, profile);
    }

    private DriverProfileDTO mapToDTO(UserEntity user, DriverProfile profile) {
        return DriverProfileDTO.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .city(user.getCity())
                .address(user.getAddress())
                .country(user.getCountry())
                .preferredLanguage(user.getLanguage())
                .verificationStatus(user.getVerificationStatus())
                .licenseNumber(profile.getLicenseNumber())
                .drivingExperienceYears(profile.getDrivingExperienceYears())
                .availabilityStatus(profile.getAvailabilityStatus())
                .workMode(profile.getWorkMode())
                .bio(profile.getBio())
                .rating(profile.getRating())
                .totalTrips(profile.getTotalTrips())
                .build();
    }
}
