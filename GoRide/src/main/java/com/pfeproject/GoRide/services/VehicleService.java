package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.VehicleDTO;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.entities.RentalStatus;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.repositories.TripRepository;
import com.pfeproject.GoRide.repositories.ConversationRepository;
import com.pfeproject.GoRide.repositories.MessageRepository;
import com.pfeproject.GoRide.repositories.BookingRepository;
import com.pfeproject.GoRide.entities.Trip;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service métier pour la gestion de la flotte de véhicules.
 * Réservé aux utilisateurs avec le rôle FLEET_OWNER.
 */
@Service
public class VehicleService {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private RentalContractRepository rentalContractRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private BookingRepository bookingRepository;

    /**
     * Ajoute un véhicule pour un propriétaire de flotte.
     * @param ownerId ID du propriétaire (Fleet Owner)
     * @param dto données du véhicule depuis le formulaire Angular
     */
    public Vehicle addVehicle(Long ownerId, VehicleDTO dto) {
        // Vérifier que la plaque n'existe pas déjà
        if (vehicleRepository.existsByLicensePlate(dto.getLicensePlate())) {
            throw new RuntimeException("Un véhicule avec cette plaque existe déjà : " + dto.getLicensePlate());
        }

        UserEntity owner = userRepo.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Propriétaire non trouvé avec l'id : " + ownerId));

        Vehicle vehicle = Vehicle.builder()
                .brand(dto.getBrand())
                .model(dto.getModel())
                .licensePlate(dto.getLicensePlate().toUpperCase())
                .seats(dto.getSeats() != null ? dto.getSeats() : 4)
                .hasWifi(dto.getHasWifi() != null ? dto.getHasWifi() : false)
                .hasBabySeat(dto.getHasBabySeat() != null ? dto.getHasBabySeat() : false)
                .luggageCapacity(dto.getLuggageCapacity() != null ? dto.getLuggageCapacity() : 2)
                .fuelType(dto.getFuelType())
                .year(dto.getYear())
                .transmission(dto.getTransmission())
                .location(dto.getLocation())
                .dailyPrice(dto.getDailyPrice())
                .photoUrl(resolvePhotoUrl(dto))
                .description(dto.getDescription())
                .color(dto.getColor())
                .hasAC(dto.getHasAC() != null ? dto.getHasAC() : true)
                .mileage(dto.getMileage())
                .category(dto.getCategory())
                .insuranceInfo(dto.getInsuranceInfo())
                .depositAmount(dto.getDepositAmount())
                .consumption(dto.getConsumption())
                .status(dto.getStatus() != null ? dto.getStatus() : com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE)
                .available(true)
                .owner(owner)
                .build();

        // Assigner un chauffeur si fourni
        if (dto.getDriverId() != null) {
            UserEntity driver = userRepo.findById(dto.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Chauffeur non trouvé avec l'id : " + dto.getDriverId()));
            vehicle.setDriver(driver);
        }

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        // Notification pour le chauffeur
        if (dto.getDriverId() != null) {
            notificationService.createNotification(
                    dto.getDriverId(),
                    "Nouveau véhicule attribué",
                    "Le propriétaire " + owner.getFirstName() + " vous a attribué le véhicule " + vehicle.getBrand() + " " + vehicle.getModel() + ".",
                    "SUCCESS",
                    "/driver/vehicle"
            );
        }

        // Log activité pour le propriétaire
        activityService.logActivity(
                owner,
                "Nouveau véhicule ajouté",
                vehicle.getBrand() + " " + vehicle.getModel() + " (" + vehicle.getLicensePlate() + ")",
                "FLEET",
                "success"
        );

        if (savedVehicle.getDailyPrice() == null || savedVehicle.getDailyPrice() <= 0) {
            throw new RuntimeException("Le prix journalier doit être supérieur à zéro");
        }

        return savedVehicle;
    }

    private String resolvePhotoUrl(VehicleDTO dto) {
        String url = dto.getPhotoUrl();
        if (url == null || url.isBlank()) {
            url = dto.getImageUrl();
        }
        if (url == null || url.isBlank()) {
            throw new RuntimeException("Une photo du véhicule est obligatoire (fichier ou lien)");
        }
        return url.trim();
    }

    /**
     * Retourne tous les véhicules d'un propriétaire de flotte sous forme de DTO.
     */
    public List<VehicleDTO> getFleetByOwner(Long ownerId) {
        System.out.println("[VehicleService] Loading fleet for ownerId: " + ownerId);
        List<Vehicle> fleet = vehicleRepository.findByOwnerId(ownerId);
        System.out.println("[VehicleService] Found " + (fleet != null ? fleet.size() : 0) + " vehicles");
        
        return fleet.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private VehicleDTO mapToDTO(Vehicle v) {
        VehicleDTO dto = new VehicleDTO();
        dto.setId(v.getId());
        dto.setBrand(v.getBrand());
        dto.setModel(v.getModel());
        dto.setLicensePlate(v.getLicensePlate());
        dto.setYear(v.getYear());
        dto.setTransmission(v.getTransmission());
        dto.setLocation(v.getLocation());
        dto.setDailyPrice(v.getDailyPrice());
        dto.setPhotoUrl(v.getPhotoUrl());
        dto.setDescription(v.getDescription());
        dto.setStatus(v.getStatus());
        dto.setSeats(v.getSeats());
        dto.setHasWifi(v.getHasWifi());
        dto.setHasBabySeat(v.getHasBabySeat());
        dto.setLuggageCapacity(v.getLuggageCapacity());
        dto.setFuelType(v.getFuelType());
        dto.setColor(v.getColor());
        dto.setHasAC(v.getHasAC());
        dto.setMileage(v.getMileage());
        dto.setCategory(v.getCategory());
        dto.setInsuranceInfo(v.getInsuranceInfo());
        dto.setDepositAmount(v.getDepositAmount());
        dto.setConsumption(v.getConsumption());
        dto.setAvailable(v.getAvailable() != null ? v.getAvailable() : true);
        
        // Calcul des stats
        dto.setViewCount(v.getViewCount() != null ? v.getViewCount() : 0);
        dto.setRating(v.getRating() != null ? v.getRating() : 0.0);
        
        long count = rentalContractRepository.countByVehicleIdAndStatus(v.getId(), RentalStatus.ACCEPTED);
        dto.setBookingCount(count);
        
        Double totalRev = rentalContractRepository.sumRevenueByVehicleId(v.getId());
        dto.setTotalRevenue(totalRev != null ? totalRev : 0.0);

        if (v.getDriver() != null) {
            dto.setDriverId(v.getDriver().getId());
        }
        return dto;
    }

    /**
     * Met à jour les informations spécifiques d'un véhicule.
     */
    public VehicleDTO updateVehicle(Long vehicleId, Long ownerId, VehicleDTO dto) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé avec l'id : " + vehicleId));

        if (!vehicle.getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Vous n'êtes pas le propriétaire de ce véhicule.");
        }

        // Mise à jour des champs (prix, image, statut, localisation, description)
        if (dto.getDailyPrice() != null) vehicle.setDailyPrice(dto.getDailyPrice());
        if (dto.getPhotoUrl() != null && !dto.getPhotoUrl().isEmpty()) vehicle.setPhotoUrl(dto.getPhotoUrl());
        if (dto.getStatus() != null) {
            vehicle.setStatus(dto.getStatus());
            vehicle.setAvailable(dto.getStatus() == com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE);
        }
        if (dto.getLocation() != null && !dto.getLocation().isEmpty()) vehicle.setLocation(dto.getLocation());
        if (dto.getDescription() != null) vehicle.setDescription(dto.getDescription());

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        activityService.logActivity(
                vehicle.getOwner(),
                "Véhicule modifié",
                vehicle.getBrand() + " " + vehicle.getModel() + " mis à jour.",
                "FLEET",
                "info"
        );

        return mapToDTO(savedVehicle);
    }

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    /**
     * Suppression "Nucléaire" : Utilise du SQL natif pour contourner tout blocage JPA/Hibernate.
     */
    /**
     * Suppression "ULTIME" : Nullification + SQL Natif + Message d'erreur personnalisé 
     * pour vérifier la version du code en cours d'exécution.
     */
    @org.springframework.transaction.annotation.Transactional
    public void deleteVehicle(Long vehicleId, Long ownerId) {
        System.out.println("[VehicleService] >>> EXÉCUTION DE LA SUPPRESSION ULTIME (ID: " + vehicleId + ") <<<");
        
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("VÉHICULE INTROUVABLE DANS LA BASE."));

        if (!vehicle.getOwner().getId().equals(ownerId)) {
            throw new SecurityException("ACCÈS REFUSÉ.");
        }

        try {
            // 1. DÉSACTIVER LES CONTRAINTES
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();

            // 2. NULLIFICATION (Sécurité supplémentaire)
            entityManager.createNativeQuery("UPDATE conversations SET vehicle_id = NULL WHERE vehicle_id = :vId").setParameter("vId", vehicleId).executeUpdate();
            entityManager.createNativeQuery("UPDATE rental_contracts SET vehicle_id = NULL WHERE vehicle_id = :vId").setParameter("vId", vehicleId).executeUpdate();
            entityManager.createNativeQuery("UPDATE trips SET vehicle_id = NULL WHERE vehicle_id = :vId").setParameter("vId", vehicleId).executeUpdate();

            // 3. SUPPRESSION DES DONNÉES LIÉES
            entityManager.createNativeQuery("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE vehicle_id IS NULL AND id NOT IN (SELECT conversation_id FROM messages WHERE conversation_id IS NOT NULL))").executeUpdate(); // Nettoyage optionnel
            
            // 4. SUPPRESSION FINALE DU VÉHICULE
            entityManager.createNativeQuery("DELETE FROM vehicles WHERE id = :vId").setParameter("vId", vehicleId).executeUpdate();

            // 5. RÉACTIVER LES CONTRAINTES
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();

            entityManager.flush();
            System.out.println("[VehicleService] >>> SUPPRESSION RÉUSSIE <<<");

            activityService.logActivity(
                    vehicle.getOwner(),
                    "Véhicule supprimé (Nettoyage Ultime)",
                    vehicle.getBrand() + " " + vehicle.getModel(),
                    "FLEET",
                    "danger"
            );
        } catch (Exception e) {
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
            System.err.println("[VehicleService] ERREUR LORS DE LA SUPPRESSION ULTIME: " + e.getMessage());
            // CE MESSAGE PERMET DE VÉRIFIER SI LE NOUVEAU CODE TOURNE :
            throw new RuntimeException("ERREUR_CRITIQUE_SUPPRESSION_VERSION_V4 : " + e.getMessage());
        }
    }

    /**
     * Assigne un chauffeur à un véhicule.
     */
    public Vehicle assignDriver(Long vehicleId, Long driverId, Long ownerId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé avec l'id : " + vehicleId));

        if (!vehicle.getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Vous n'êtes pas le propriétaire de ce véhicule.");
        }

        UserEntity driver = userRepo.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Chauffeur non trouvé avec l'id : " + driverId));

        vehicle.setDriver(driver);
        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        // Notification pour le chauffeur
        notificationService.createNotification(
                driverId,
                "Attribution de véhicule",
                "On vous a assigné le véhicule " + vehicle.getBrand() + " (" + vehicle.getLicensePlate() + ").",
                "INFO",
                "/driver/vehicle"
        );

        return savedVehicle;
    }

    /**
     * Retourne tous les véhicules disponibles.
     */
    public List<Vehicle> getAvailableVehicles() {
        return searchAvailableVehicles(null, null, null, null);
    }

    /**
     * Véhicules visibles pour les clients : flag available + statut AVAILABLE.
     */
    public List<Vehicle> searchAvailableVehicles(String query, String location, String category, Double maxPrice) {
        List<Vehicle> available = vehicleRepository.findByAvailableTrueAndStatus(
                com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE);

        String q = query != null ? query.trim().toLowerCase() : "";
        String loc = location != null ? location.trim().toLowerCase() : "";
        String cat = category != null ? category.trim() : "";

        return available.stream()
                .filter(v -> maxPrice == null || v.getDailyPrice() == null || v.getDailyPrice() <= maxPrice)
                .filter(v -> cat.isEmpty() || "Toutes".equalsIgnoreCase(cat)
                        || (v.getCategory() != null && v.getCategory().equalsIgnoreCase(cat)))
                .filter(v -> loc.isEmpty() || (v.getLocation() != null
                        && v.getLocation().toLowerCase().contains(loc)))
                .filter(v -> q.isEmpty() || matchesSearchQuery(v, q))
                .toList();
    }

    private boolean matchesSearchQuery(Vehicle v, String q) {
        if (v.getBrand() != null && v.getBrand().toLowerCase().contains(q)) return true;
        if (v.getModel() != null && v.getModel().toLowerCase().contains(q)) return true;
        if (v.getLocation() != null && v.getLocation().toLowerCase().contains(q)) return true;
        if (v.getCategory() != null && v.getCategory().toLowerCase().contains(q)) return true;
        return false;
    }

    /**
     * Active ou désactive la visibilité d'un véhicule dans les recherches clients.
     * Si désactivé, le véhicule n'apparaît plus dans GET /vehicles/available.
     */
    public VehicleDTO toggleAvailability(Long vehicleId, Long ownerId, boolean available) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé avec l'id : " + vehicleId));

        if (!vehicle.getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Vous n'êtes pas le propriétaire de ce véhicule.");
        }

        vehicle.setAvailable(available);
        // Synchroniser le statut : si désactivé et était AVAILABLE, passer à UNAVAILABLE
        if (!available && vehicle.getStatus() == com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE) {
            vehicle.setStatus(com.pfeproject.GoRide.entities.VehicleStatus.UNAVAILABLE);
        }
        // Si réactivé et était UNAVAILABLE, repasser à AVAILABLE
        if (available && vehicle.getStatus() == com.pfeproject.GoRide.entities.VehicleStatus.UNAVAILABLE) {
            vehicle.setStatus(com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE);
        }

        Vehicle saved = vehicleRepository.save(vehicle);

        activityService.logActivity(
                vehicle.getOwner(),
                available ? "Véhicule activé" : "Véhicule désactivé",
                vehicle.getBrand() + " " + vehicle.getModel() + " (" + vehicle.getLicensePlate() + ")",
                "FLEET",
                available ? "success" : "warning"
        );

        return mapToDTO(saved);
    }
}
