package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.ClientSettingsDTO;
import com.pfeproject.GoRide.entities.ClientSettings;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.ClientSettingsRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientSettingsService {

    @Autowired
    private ClientSettingsRepository clientSettingsRepository;

    @Autowired
    private UserRepo userRepository;

    public ClientSettingsDTO getSettings(Long userId) {
        ClientSettings settings = clientSettingsRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultSettings(userId));
        return mapToDTO(settings);
    }

    @Transactional
    public ClientSettingsDTO updateSettings(Long userId, ClientSettingsDTO dto) {
        ClientSettings settings = clientSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserEntity user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    return ClientSettings.builder().user(user).build();
                });

        updateSettingsFromDTO(settings, dto);
        settings = clientSettingsRepository.save(settings);
        return mapToDTO(settings);
    }

    private ClientSettings createDefaultSettings(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ClientSettings settings = ClientSettings.builder()
                .user(user)
                .defaultPickupLocation("Tunis")
                .defaultReturnLocation("Tunis")
                .preferredVehicleType("Compacte")
                .preferredTransmission("Automatique")
                .preferredFuelType("Essence")
                .maxBudgetPerDay(150.0)
                .preferredRentalDuration("2-3 jours")
                .airConditioning(true)
                .gps(true)
                .babySeat(false)
                .largeTrunk(false)
                .unlimitedMileage(true)
                .onlyAvailableVehicles(true)
                .sortByPrice(false)
                .proximitySearch(true)
                .bestRatedFirst(true)
                .insuranceIncluded(false)
                .reservationNotifications(true)
                .returnReminderNotifications(true)
                .messageNotifications(true)
                .emailNotifications(true)
                .allowLocation(true)
                .shareProfileWithOwners(true)
                .showFullName(false)
                .build();
        
        return clientSettingsRepository.save(settings);
    }

    private void updateSettingsFromDTO(ClientSettings settings, ClientSettingsDTO dto) {
        if (dto.getDefaultPickupLocation() != null) settings.setDefaultPickupLocation(dto.getDefaultPickupLocation());
        if (dto.getDefaultReturnLocation() != null) settings.setDefaultReturnLocation(dto.getDefaultReturnLocation());
        if (dto.getPreferredVehicleType() != null) settings.setPreferredVehicleType(dto.getPreferredVehicleType());
        if (dto.getPreferredTransmission() != null) settings.setPreferredTransmission(dto.getPreferredTransmission());
        if (dto.getPreferredFuelType() != null) settings.setPreferredFuelType(dto.getPreferredFuelType());
        if (dto.getMaxBudgetPerDay() != null) settings.setMaxBudgetPerDay(dto.getMaxBudgetPerDay());
        if (dto.getPreferredRentalDuration() != null) settings.setPreferredRentalDuration(dto.getPreferredRentalDuration());
        if (dto.getAirConditioning() != null) settings.setAirConditioning(dto.getAirConditioning());
        if (dto.getGps() != null) settings.setGps(dto.getGps());
        if (dto.getBabySeat() != null) settings.setBabySeat(dto.getBabySeat());
        if (dto.getLargeTrunk() != null) settings.setLargeTrunk(dto.getLargeTrunk());
        if (dto.getUnlimitedMileage() != null) settings.setUnlimitedMileage(dto.getUnlimitedMileage());
        if (dto.getOnlyAvailableVehicles() != null) settings.setOnlyAvailableVehicles(dto.getOnlyAvailableVehicles());
        if (dto.getSortByPrice() != null) settings.setSortByPrice(dto.getSortByPrice());
        if (dto.getProximitySearch() != null) settings.setProximitySearch(dto.getProximitySearch());
        if (dto.getBestRatedFirst() != null) settings.setBestRatedFirst(dto.getBestRatedFirst());
        if (dto.getInsuranceIncluded() != null) settings.setInsuranceIncluded(dto.getInsuranceIncluded());
        if (dto.getReservationNotifications() != null) settings.setReservationNotifications(dto.getReservationNotifications());
        if (dto.getReturnReminderNotifications() != null) settings.setReturnReminderNotifications(dto.getReturnReminderNotifications());
        if (dto.getMessageNotifications() != null) settings.setMessageNotifications(dto.getMessageNotifications());
        if (dto.getEmailNotifications() != null) settings.setEmailNotifications(dto.getEmailNotifications());
        if (dto.getAllowLocation() != null) settings.setAllowLocation(dto.getAllowLocation());
        if (dto.getShareProfileWithOwners() != null) settings.setShareProfileWithOwners(dto.getShareProfileWithOwners());
        if (dto.getShowFullName() != null) settings.setShowFullName(dto.getShowFullName());
    }

    private ClientSettingsDTO mapToDTO(ClientSettings s) {
        return ClientSettingsDTO.builder()
                .defaultPickupLocation(s.getDefaultPickupLocation())
                .defaultReturnLocation(s.getDefaultReturnLocation())
                .preferredVehicleType(s.getPreferredVehicleType())
                .preferredTransmission(s.getPreferredTransmission())
                .preferredFuelType(s.getPreferredFuelType())
                .maxBudgetPerDay(s.getMaxBudgetPerDay())
                .preferredRentalDuration(s.getPreferredRentalDuration())
                .airConditioning(s.getAirConditioning())
                .gps(s.getGps())
                .babySeat(s.getBabySeat())
                .largeTrunk(s.getLargeTrunk())
                .unlimitedMileage(s.getUnlimitedMileage())
                .onlyAvailableVehicles(s.getOnlyAvailableVehicles())
                .sortByPrice(s.getSortByPrice())
                .proximitySearch(s.getProximitySearch())
                .bestRatedFirst(s.getBestRatedFirst())
                .insuranceIncluded(s.getInsuranceIncluded())
                .reservationNotifications(s.getReservationNotifications())
                .returnReminderNotifications(s.getReturnReminderNotifications())
                .messageNotifications(s.getMessageNotifications())
                .emailNotifications(s.getEmailNotifications())
                .allowLocation(s.getAllowLocation())
                .shareProfileWithOwners(s.getShareProfileWithOwners())
                .showFullName(s.getShowFullName())
                .build();
    }

    @PostConstruct
    public void seedDefaultSettings() {
        // Seed for user 5 if not exists
        if (userRepository.existsById(5L) && clientSettingsRepository.findByUserId(5L).isEmpty()) {
            createDefaultSettings(5L);
        }
    }
}
