package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.MessageResponse;
import com.pfeproject.GoRide.dto.TripDTO;
import com.pfeproject.GoRide.dto.TripResponseDto;
import com.pfeproject.GoRide.entities.Trip;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.TripService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur pour la gestion des trajets.
 * - Création/annulation : DRIVER uniquement
 * - Consultation des trajets disponibles : tout utilisateur authentifié
 */
@RestController
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class TripController {

    @Autowired
    private TripService tripService;

    /**
     * POST /api/driver/trips
     * Crée un nouveau trajet (chauffeur connecté).
     */
    @PostMapping("/api/driver/trips")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> createTrip(
            @Valid @RequestBody TripDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            TripResponseDto trip = tripService.createTrip(userDetails.getId(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(trip);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @Autowired
    private com.pfeproject.GoRide.repositories.RideRequestRepository rideRequestRepository;

    /**
     * GET /api/driver/trips
     * Retourne les trajets du chauffeur connecté et les demandes passager acceptées/en cours/terminées.
     */
    @GetMapping("/api/driver/trips")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getMyTrips(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long driverId = userDetails.getId();

        java.util.List<java.util.Map<String, Object>> unifiedTrips = new java.util.ArrayList<>();

        // 1. Published trips
        List<TripResponseDto> publishedTrips = tripService.getTripsByDriver(driverId);
        for (TripResponseDto t : publishedTrips) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", t.getId());
            map.put("source", "TRIP");
            map.put("departure", t.getDeparture());
            map.put("destination", t.getDestination());
            map.put("departureTime", t.getDepartureTime() != null ? t.getDepartureTime().toString() : "");
            map.put("availableSeats", t.getAvailableSeats());
            map.put("pricePerSeat", t.getPricePerSeat());
            map.put("status", t.getStatus());
            map.put("notes", t.getNotes());
            map.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
            map.put("driverId", t.getDriverId());
            map.put("driverName", t.getDriverName());
            map.put("vehicleId", t.getVehicleId());
            map.put("vehicleName", t.getVehicleName());
            unifiedTrips.add(map);
        }

        // 2. Accepted/In_progress/Completed ride requests
        List<com.pfeproject.GoRide.entities.RideRequest> requests = rideRequestRepository.findByDriverIdOrderByCreatedAtDesc(driverId);
        for (com.pfeproject.GoRide.entities.RideRequest r : requests) {
            // Include ACCEPTED, IN_PROGRESS, COMPLETED
            if ("ACCEPTED".equalsIgnoreCase(r.getStatus()) || 
                "IN_PROGRESS".equalsIgnoreCase(r.getStatus()) || 
                "COMPLETED".equalsIgnoreCase(r.getStatus())) {
                
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", r.getId());
                map.put("source", "RIDE_REQUEST");
                map.put("departure", r.getDeparture());
                map.put("destination", r.getDestination());
                // Use acceptedAt or createdAt as departureTime
                map.put("departureTime", r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
                map.put("availableSeats", r.getPassengers() != null ? r.getPassengers() : 1);
                map.put("pricePerSeat", r.getEstimatedPrice());
                
                // Mettre à jour le statut pour correspondre au front
                String status = r.getStatus();
                if ("ACCEPTED".equalsIgnoreCase(status)) status = "CONFIRMED";
                map.put("status", status);
                
                map.put("notes", r.getComment());
                map.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
                map.put("driverId", driverId);
                
                String clientName = "Client Inconnu";
                if (r.getClient() != null) {
                    clientName = (r.getClient().getFirstName() + " " + r.getClient().getLastName()).trim();
                    if (clientName.isEmpty() || "null null".equals(clientName)) clientName = r.getClient().getEmail();
                }
                map.put("clientName", clientName);
                
                unifiedTrips.add(map);
            }
        }

        return ResponseEntity.ok(unifiedTrips);
    }

    /**
     * DELETE /api/driver/trips/{id}
     * Annule un trajet (chauffeur propriétaire uniquement).
     */
    @DeleteMapping("/api/driver/trips/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> cancelTrip(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            tripService.cancelTrip(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Trajet annulé avec succès."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/trips
     * Retourne tous les trajets disponibles (pour les clients).
     * Optional query params: departure, destination
     */
    @GetMapping("/api/trips")
    public ResponseEntity<List<TripResponseDto>> getAvailableTrips(
            @RequestParam(required = false) String departure,
            @RequestParam(required = false) String destination) {
        List<TripResponseDto> trips = tripService.searchAvailableTrips(departure, destination);
        return ResponseEntity.ok(trips);
    }

    /**
     * PUT /api/driver/trips/{id}
     */
    @PutMapping("/api/driver/trips/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> updateTrip(
            @PathVariable Long id,
            @Valid @RequestBody TripDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            return ResponseEntity.ok(tripService.updateTrip(id, userDetails.getId(), dto));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * PATCH /api/driver/trips/{id}/status
     */
    @PatchMapping("/api/driver/trips/{id}/status")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> updateTripStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String status = body.get("status");
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().body(new MessageResponse("Le statut est obligatoire."));
            }
            return ResponseEntity.ok(tripService.updateTripStatus(id, userDetails.getId(), status));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * POST /api/driver/trips/{id}/republish
     */
    @PostMapping("/api/driver/trips/{id}/republish")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> republishTrip(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            return ResponseEntity.ok(tripService.republishTrip(id, userDetails.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/trips/{id}
     * Retourne un trajet par son ID.
     */
    @GetMapping("/api/trips/{id}")
    public ResponseEntity<?> getTripById(@PathVariable Long id) {
        try {
            TripResponseDto trip = tripService.getTripById(id);
            return ResponseEntity.ok(trip);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
