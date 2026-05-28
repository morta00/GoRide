package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.TripDTO;
import com.pfeproject.GoRide.dto.TripResponseDto;
import com.pfeproject.GoRide.entities.Trip;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.repositories.TripRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import com.pfeproject.GoRide.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service métier pour la gestion des trajets.
 */
@Service
public class TripService {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Crée un nouveau trajet pour un chauffeur.
     */
    public TripResponseDto createTrip(Long driverId, TripDTO dto) {
        UserEntity driver = userRepo.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Chauffeur non trouvé avec l'id : " + driverId));
 
        Trip trip = Trip.builder()
                .departure(dto.getDeparture())
                .destination(dto.getDestination())
                .departureTime(dto.getDepartureTime())
                .availableSeats(dto.getAvailableSeats())
                .pricePerSeat(dto.getPricePerSeat())
                .notes(dto.getNotes())
                .status("PUBLISHED")
                .driver(driver)
                .build();
 
        // Associer un véhicule si fourni
        if (dto.getVehicleId() != null) {
            Vehicle vehicle = vehicleRepository.findById(dto.getVehicleId())
                    .orElseThrow(() -> new RuntimeException("Véhicule non trouvé avec l'id : " + dto.getVehicleId()));
            
            // Vérifier que le véhicule appartient ou est assigné à ce chauffeur
            boolean isOwner = vehicle.getOwner() != null && vehicle.getOwner().getId().equals(driverId);
            boolean isDriver = vehicle.getDriver() != null && vehicle.getDriver().getId().equals(driverId);
            if (!isOwner && !isDriver) {
                throw new RuntimeException("Ce véhicule n'est pas votre véhicule de travail actif.");
            }
            
            trip.setVehicle(vehicle);
        }
 
        Trip savedTrip = tripRepository.save(trip);
 
        // Notification pour le chauffeur (confirmation de création)
        notificationService.createNotification(
                driverId,
                "Trajet créé",
                "Votre trajet de " + trip.getDeparture() + " vers " + trip.getDestination() + " est maintenant en ligne.",
                "SUCCESS",
                "/driver/rides"
        );
 
        return mapToDto(savedTrip);
    }

    /**
     * Retourne tous les trajets disponibles (dans le futur).
     */
    public List<TripResponseDto> getAvailableTrips() {
        return searchAvailableTrips(null, null);
    }

    /**
     * Search published trips with optional departure/destination filters (case-insensitive).
     */
    public List<TripResponseDto> searchAvailableTrips(String departure, String destination) {
        String dep = (departure != null && !departure.isBlank()) ? departure.trim() : null;
        String dest = (destination != null && !destination.isBlank()) ? destination.trim() : null;

        return tripRepository.findAvailableTripsWithDetails(LocalDateTime.now())
                .stream()
                .filter(t -> dep == null || t.getDeparture().toLowerCase().contains(dep.toLowerCase()))
                .filter(t -> dest == null || t.getDestination().toLowerCase().contains(dest.toLowerCase()))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public TripResponseDto updateTrip(Long tripId, Long driverId, TripDTO dto) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trajet non trouvé avec l'id : " + tripId));

        if (!trip.getDriver().getId().equals(driverId)) {
            throw new SecurityException("Vous n'êtes pas le chauffeur de ce trajet.");
        }

        if (dto.getDeparture() != null) trip.setDeparture(dto.getDeparture());
        if (dto.getDestination() != null) trip.setDestination(dto.getDestination());
        if (dto.getDepartureTime() != null) trip.setDepartureTime(dto.getDepartureTime());
        if (dto.getAvailableSeats() != null) trip.setAvailableSeats(dto.getAvailableSeats());
        if (dto.getPricePerSeat() != null) trip.setPricePerSeat(dto.getPricePerSeat());
        if (dto.getNotes() != null) trip.setNotes(dto.getNotes());

        return mapToDto(tripRepository.save(trip));
    }

    public TripResponseDto updateTripStatus(Long tripId, Long driverId, String status) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trajet non trouvé avec l'id : " + tripId));

        if (!trip.getDriver().getId().equals(driverId)) {
            throw new SecurityException("Vous n'êtes pas le chauffeur de ce trajet.");
        }

        trip.setStatus(status);
        return mapToDto(tripRepository.save(trip));
    }

    public TripResponseDto republishTrip(Long tripId, Long driverId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trajet non trouvé avec l'id : " + tripId));

        if (!trip.getDriver().getId().equals(driverId)) {
            throw new SecurityException("Vous n'êtes pas le chauffeur de ce trajet.");
        }

        trip.setStatus("PUBLISHED");
        if (trip.getDepartureTime() != null && trip.getDepartureTime().isBefore(LocalDateTime.now())) {
            trip.setDepartureTime(LocalDateTime.now().plusDays(1));
        }
        return mapToDto(tripRepository.save(trip));
    }

    /**
     * Retourne tous les trajets d'un chauffeur.
     */
    public List<TripResponseDto> getTripsByDriver(Long driverId) {
        return tripRepository.findByDriverId(driverId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    /**
     * Annule un trajet (uniquement par son chauffeur).
     */
    public void cancelTrip(Long tripId, Long driverId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trajet non trouvé avec l'id : " + tripId));

        if (!trip.getDriver().getId().equals(driverId)) {
            throw new SecurityException("Vous n'êtes pas le chauffeur de ce trajet.");
        }

        trip.setStatus("CANCELLED");
        tripRepository.save(trip);

        // Notification pour le chauffeur
        notificationService.createNotification(
                driverId,
                "Trajet annulé",
                "Votre trajet vers " + trip.getDestination() + " a bien été annulé.",
                "DANGER",
                "/driver/rides"
        );
    }

    /**
     * Retourne un trajet par son ID.
     */
    public TripResponseDto getTripById(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trajet non trouvé avec l'id : " + tripId));
        return mapToDto(trip);
    }

    private TripResponseDto mapToDto(Trip t) {
        TripResponseDto dto = new TripResponseDto();
        dto.setId(t.getId());
        dto.setDeparture(t.getDeparture());
        dto.setDestination(t.getDestination());
        dto.setDepartureTime(t.getDepartureTime());
        dto.setAvailableSeats(t.getAvailableSeats());
        dto.setPricePerSeat(t.getPricePerSeat());
        dto.setStatus(t.getStatus());
        dto.setNotes(t.getNotes());
        dto.setCreatedAt(t.getCreatedAt());

        if (t.getDriver() != null) {
            dto.setDriverId(t.getDriver().getId());
            dto.setDriverName(t.getDriver().getFirstName() + " " + t.getDriver().getLastName());
            dto.setDriverPhoto(t.getDriver().getPhotoUrl());
            // Rating could be fetched from ReviewRepository if needed
        }

        if (t.getVehicle() != null) {
            dto.setVehicleId(t.getVehicle().getId());
            dto.setVehicleName(t.getVehicle().getBrand() + " " + t.getVehicle().getModel());
            dto.setVehiclePlate(t.getVehicle().getLicensePlate());
        }

        return dto;
    }
}
