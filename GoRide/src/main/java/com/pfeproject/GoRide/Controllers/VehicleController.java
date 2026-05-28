package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.FleetDashboardStatsDTO;
import com.pfeproject.GoRide.dto.MessageResponse;
import com.pfeproject.GoRide.dto.RecentActivityDTO;
import com.pfeproject.GoRide.dto.RecentBookingDTO;
import com.pfeproject.GoRide.dto.VehicleDTO;
import com.pfeproject.GoRide.entities.Activity;
import com.pfeproject.GoRide.entities.ERole;
import com.pfeproject.GoRide.entities.RentalContract;
import com.pfeproject.GoRide.entities.RentalStatus;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.entities.VehicleStatus;
import com.pfeproject.GoRide.entities.CompanyServiceRequest;
import com.pfeproject.GoRide.repositories.CompanyServiceRequestRepository;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.RentalService;
import com.pfeproject.GoRide.services.VehicleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import com.pfeproject.GoRide.services.VehiclePhotoStorageService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Contrôleur pour la gestion de la flotte de véhicules.
 * Toutes les routes nécessitent le rôle FLEET_OWNER sauf GET /available.
 */
@RestController
@RequestMapping("/api/fleet")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class VehicleController {

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private VehiclePhotoStorageService vehiclePhotoStorageService;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private RentalContractRepository rentalContractRepository;

    @Autowired
    private RentalService rentalService;

    @Autowired
    private com.pfeproject.GoRide.repositories.ActivityRepository activityRepository;

    @Autowired
    private CompanyServiceRequestRepository companyServiceRequestRepository;

    /**
     * GET /api/fleet/dashboard/stats
     * Retourne les indicateurs clés du tableau de bord du propriétaire connecté.
     */
    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<FleetDashboardStatsDTO> getDashboardStats(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long ownerId = userDetails.getId();

        // Récupérer tous les véhicules du propriétaire pour garantir la cohérence
        List<Vehicle> myVehicles = vehicleRepository.findByOwnerId(ownerId);

        // 1. Total véhicules
        long totalVehicles = myVehicles.size();

        // 2. Véhicules par statut
        long availableVehicles = myVehicles.stream().filter(v -> v.getStatus() == VehicleStatus.AVAILABLE).count();
        long rentedVehicles = myVehicles.stream().filter(v -> v.getStatus() == VehicleStatus.RENTED).count();
        long maintenanceVehicles = myVehicles.stream().filter(v -> v.getStatus() == VehicleStatus.MAINTENANCE).count();

        // 3. Réservations en attente (PENDING)
        long pendingBookings = rentalContractRepository.countByOwnerIdAndStatus(ownerId, RentalStatus.PENDING);

        // 4. Revenus du mois courant
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        Double rev = rentalContractRepository.sumRevenueByOwnerSince(ownerId, startOfMonth);
        double monthlyRevenue = (rev != null) ? rev : 0.0;

        FleetDashboardStatsDTO stats = new FleetDashboardStatsDTO(
                totalVehicles,
                availableVehicles,
                rentedVehicles,
                maintenanceVehicles,
                pendingBookings,
                monthlyRevenue,
                0.0, // Trends neutralisés pour l'instant
                0.0,
                0.0,
                0.0
        );
        return ResponseEntity.ok(stats);
    }

    /**
     * GET /api/fleet/dashboard/recent-bookings
     * Retourne les 10 réservations les plus récentes du propriétaire connecté,
     * avec toutes les infos de prix et badges.
     */
    @GetMapping("/dashboard/recent-bookings")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<RecentBookingDTO>> getRecentBookings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long ownerId = userDetails.getId();

        List<RentalContract> contracts = rentalContractRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);

        List<RecentBookingDTO> dtos = contracts.stream().limit(10).map(c -> {
            RecentBookingDTO dto = new RecentBookingDTO();
            dto.setId(c.getId());

            // Client
            dto.setRenterFirstName(c.getRenter().getFirstName());
            dto.setRenterLastName(c.getRenter().getLastName());
            dto.setRenterEmail(c.getRenter().getEmail());
            boolean isDriver = c.getRenter().getRoles().stream()
                    .anyMatch(r -> r.getName() == ERole.ROLE_DRIVER);
            dto.setRenterIsDriver(isDriver);

            // Véhicule
            dto.setVehicleBrand(c.getVehicle().getBrand());
            dto.setVehicleModel(c.getVehicle().getModel());
            dto.setVehicleLicensePlate(c.getVehicle().getLicensePlate());

            // Dates
            dto.setStartDate(c.getStartDate());
            dto.setEndDate(c.getEndDate());

            // Prix
            long days = java.time.temporal.ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate());
            if (days <= 0) days = 1;
            Double dailyPrice = c.getVehicle().getDailyPrice() != null ? c.getVehicle().getDailyPrice() : 0.0;
            dto.setInitialPrice(dailyPrice * days);
            dto.setProposedPrice(c.getProposedPrice());
            dto.setDriverDiscount(c.getDriverDiscountPercentage());
            dto.setFinalPrice(c.getFinalPrice());

            // Prix négocié si le client a proposé un prix différent du prix initial
            boolean negotiated = c.getProposedPrice() != null && !c.getProposedPrice().equals(dailyPrice * days);
            dto.setPriceNegotiated(negotiated);

            // Statut
            dto.setStatus(c.getStatus() != null ? c.getStatus().name() : "PENDING");
            dto.setClientNotes(c.getClientNotes());
            dto.setCreatedAt(c.getCreatedAt());

            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * PATCH /api/fleet/dashboard/bookings/{id}/respond
     * Accepter ou refuser une réservation depuis le dashboard.
     * Body: { "status": "ACCEPTED" | "REJECTED" }
     */
    @PatchMapping("/dashboard/bookings/{id}/respond")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> respondToBooking(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String statusStr = (String) body.get("status");
            Double newPrice = body.get("newPrice") != null ? Double.valueOf(body.get("newPrice").toString()) : null;
            RentalStatus status = RentalStatus.valueOf(statusStr);
            RentalContract contract = rentalService.respondToReservation(userDetails.getId(), id, status, newPrice);
            return ResponseEntity.ok(contract);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * POST /api/fleet/vehicles/photo
     * Upload d'une photo véhicule (retourne l'URL publique /vehicle-photos/...).
     */
    @PostMapping(value = "/vehicles/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> uploadVehiclePhoto(@RequestParam("file") MultipartFile file) {
        try {
            String photoUrl = vehiclePhotoStorageService.store(file);
            return ResponseEntity.ok(Map.of("photoUrl", photoUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Échec de l'envoi de la photo : " + e.getMessage()));
        }
    }

    /**
     * POST /api/fleet/vehicles
     * Ajoute un véhicule à la flotte du Fleet Owner connecté.
     */
    @PostMapping("/vehicles")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> addVehicle(
            @Valid @RequestBody VehicleDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Vehicle vehicle = vehicleService.addVehicle(userDetails.getId(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(vehicle);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/fleet/dashboard/recent-activities
     * Retourne les 5 dernières activités du propriétaire connecté.
     */
    @GetMapping("/dashboard/recent-activities")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<RecentActivityDTO>> getRecentActivities(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<Activity> activities = activityRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<RecentActivityDTO> dtos = activities.stream()
                .filter(a -> "FLEET".equals(a.getType()))
                .limit(5)
                .map(a -> new RecentActivityDTO(
                        a.getTitle(),
                        a.getDescription(),
                        a.getType(),
                        a.getCategory(),
                        a.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * GET /api/fleet/vehicles
     * Retourne la liste des véhicules du Fleet Owner connecté.
     */
    @GetMapping("/vehicles")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<VehicleDTO>> getMyFleet(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<VehicleDTO> fleet = vehicleService.getFleetByOwner(userDetails.getId());
        return ResponseEntity.ok(fleet);
    }

    /**
     * PUT /api/fleet/vehicles/{id}
     * Met à jour un véhicule existant (modification partielle autorisée en ignorant @Valid pour ce endpoint ou en utilisant un DTO séparé).
     * Ici on accepte le VehicleDTO, mais comme certaines validations peuvent bloquer, on retire @Valid pour la modif partielle.
     */
    @PutMapping("/vehicles/{id}")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> updateVehicle(
            @PathVariable Long id,
            @RequestBody VehicleDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            VehicleDTO updated = vehicleService.updateVehicle(id, userDetails.getId(), dto);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/fleet/vehicles/{id}/bookings
     * Retourne l'historique des réservations pour un véhicule spécifique.
     */
    @GetMapping("/vehicles/{id}/bookings")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> getVehicleBookings(@PathVariable Long id, Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            // Verify ownership
            Vehicle vehicle = vehicleRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Véhicule non trouvé."));
            if (!vehicle.getOwner().getId().equals(userDetails.getId())) {
                throw new SecurityException("Vous n'êtes pas le propriétaire de ce véhicule.");
            }

            List<RentalContract> contracts = rentalContractRepository.findByVehicleId(id);
            
            List<RecentBookingDTO> dtos = contracts.stream().map(c -> {
                RecentBookingDTO dto = new RecentBookingDTO();
                dto.setId(c.getId());
                dto.setRenterFirstName(c.getRenter().getFirstName());
                dto.setRenterLastName(c.getRenter().getLastName());
                dto.setRenterEmail(c.getRenter().getEmail());
                boolean isDriver = c.getRenter().getRoles().stream()
                        .anyMatch(r -> r.getName() == ERole.ROLE_DRIVER);
                dto.setRenterIsDriver(isDriver);
                dto.setVehicleBrand(c.getVehicle().getBrand());
                dto.setVehicleModel(c.getVehicle().getModel());
                dto.setVehicleLicensePlate(c.getVehicle().getLicensePlate());
                dto.setStartDate(c.getStartDate());
                dto.setEndDate(c.getEndDate());
                long days = java.time.temporal.ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate());
                if (days <= 0) days = 1;
                Double dailyPrice = c.getVehicle().getDailyPrice() != null ? c.getVehicle().getDailyPrice() : 0.0;
                dto.setInitialPrice(dailyPrice * days);
                dto.setProposedPrice(c.getProposedPrice());
                dto.setDriverDiscount(c.getDriverDiscountPercentage());
                dto.setFinalPrice(c.getFinalPrice());
                boolean negotiated = c.getProposedPrice() != null && !c.getProposedPrice().equals(dailyPrice * days);
                dto.setPriceNegotiated(negotiated);
                dto.setStatus(c.getStatus() != null ? c.getStatus().name() : "PENDING");
                dto.setClientNotes(c.getClientNotes());
                dto.setCreatedAt(c.getCreatedAt());
                return dto;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(dtos);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * DELETE /api/fleet/vehicles/{id}
     * Supprime un véhicule de la flotte.
     */
    @DeleteMapping("/vehicles/{id}")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> deleteVehicle(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            vehicleService.deleteVehicle(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Véhicule supprimé avec succès."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * PATCH /api/fleet/vehicles/{id}/assign-driver
     * Assigne un chauffeur à un véhicule.
     * Body: { "driverId": 5 }
     */
    @PatchMapping("/vehicles/{id}/assign-driver")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> assignDriver(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long driverId = body.get("driverId");
            if (driverId == null) {
                return ResponseEntity.badRequest().body(new MessageResponse("driverId est requis."));
            }
            Vehicle vehicle = vehicleService.assignDriver(id, driverId, userDetails.getId());
            return ResponseEntity.ok(vehicle);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/fleet/vehicles/available
     * Retourne tous les véhicules disponibles (accès authentifié).
     */
    @GetMapping("/vehicles/available")
    public ResponseEntity<List<java.util.Map<String, Object>>> getAvailableVehicles(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String q,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String location,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String category,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Double maxPrice) {
        List<com.pfeproject.GoRide.entities.Vehicle> vehicles = vehicleService.searchAvailableVehicles(
                q, location, category, maxPrice);
        
        List<java.util.Map<String, Object>> result = vehicles.stream().map(v -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", v.getId());
            map.put("brand", v.getBrand());
            map.put("model", v.getModel());
            map.put("licensePlate", v.getLicensePlate());
            map.put("dailyPrice", v.getDailyPrice());
            map.put("location", v.getLocation());
            map.put("latitude", v.getLatitude());
            map.put("longitude", v.getLongitude());
            map.put("category", v.getCategory());
            map.put("transmission", v.getTransmission());
            map.put("fuelType", v.getFuelType());
            map.put("seats", v.getSeats());
            map.put("photoUrl", v.getPhotoUrl());
            map.put("imageUrl", v.getPhotoUrl());
            map.put("description", v.getDescription());
            map.put("status", v.getStatus());
            map.put("rating", v.getRating());
            map.put("available", v.getAvailable());
            
            if (v.getOwner() != null) {
                java.util.Map<String, Object> owner = new java.util.HashMap<>();
                owner.put("id", v.getOwner().getId());
                owner.put("firstName", v.getOwner().getFirstName());
                owner.put("lastName", v.getOwner().getLastName());
                map.put("owner", owner);
            }
            
            return map;
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/fleet/company-requests — demandes entreprise pour les véhicules du propriétaire.
     */
    @GetMapping("/company-requests")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<Map<String, Object>>> getCompanyServiceRequests(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<CompanyServiceRequest> list =
                companyServiceRequestRepository.findVehicleRentalRequestsForOwner(userDetails.getId());
        List<Map<String, Object>> result = list.stream().map(r -> {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", "csr-" + r.getId());
            m.put("companyServiceRequestId", r.getId());
            m.put("type", r.getType());
            m.put("status", mapCompanyStatusToRental(r.getStatus()));
            m.put("companyName", r.getCompanyName());
            m.put("vehicleId", r.getVehicleId());
            m.put("vehicleName", r.getVehicleName());
            m.put("startDate", r.getStartDate());
            m.put("endDate", r.getEndDate());
            m.put("city", r.getCity());
            m.put("comment", r.getComment());
            m.put("requestedQuantity", r.getRequestedQuantity());
            m.put("budget", r.getBudget());
            m.put("createdAt", r.getCreatedAt());
            m.put("source", "COMPANY_SERVICE");
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private String mapCompanyStatusToRental(String status) {
        if (status == null) return "PENDING";
        if (status.contains("PENDING")) return "PENDING";
        if ("CONFIRMED".equalsIgnoreCase(status) || status.contains("ACCEPTED")) return "ACCEPTED";
        if (status.contains("REJECTED")) return "REJECTED";
        if ("CANCELLED".equalsIgnoreCase(status)) return "CANCELLED";
        return status;
    }

    @PatchMapping("/company-requests/{id}/respond")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> respondCompanyServiceRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Le statut est requis."));
        }
        CompanyServiceRequest req = companyServiceRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Demande introuvable"));
        Vehicle vehicle = req.getVehicleId() != null
                ? vehicleRepository.findById(req.getVehicleId()).orElse(null) : null;
        if (vehicle == null || vehicle.getOwner() == null
                || !vehicle.getOwner().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body(new MessageResponse("Accès refusé à cette demande."));
        }
        req.setStatus(status);
        companyServiceRequestRepository.save(req);
        return ResponseEntity.ok(Map.of("message", "Statut mis à jour", "status", status));
    }

    /**
     * PATCH /api/fleet/vehicles/{id}/toggle-availability
     * Active ou désactive la visibilité d'un véhicule dans les recherches clients.
     * Body: { "available": true|false }
     */
    @PatchMapping("/vehicles/{id}/toggle-availability")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> toggleAvailability(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Boolean available = (Boolean) body.get("available");
            if (available == null) {
                return ResponseEntity.badRequest().body(new MessageResponse("Le champ 'available' est requis."));
            }
            VehicleDTO updated = vehicleService.toggleAvailability(id, userDetails.getId(), available);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
