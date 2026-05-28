package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.CalendarEventDTO;
import com.pfeproject.GoRide.dto.RentalContractDTO;
import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RentalService {

    @Autowired
    private RentalContractRepository rentalRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private ActivityService activityService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RentalContractRepository rentalContractRepository;

    public List<RentalContract> getAllRentals() {
        return rentalRepository.findAll();
    }

    public RentalContract createReservation(Long clientId, RentalContractDTO dto) {
        UserEntity renter = userRepo.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        Vehicle vehicle = vehicleRepository.findById(dto.getVehicleId())
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé"));

        if (vehicle.getStatus() != VehicleStatus.AVAILABLE) {
            throw new RuntimeException("Le véhicule n'est pas disponible à la location");
        }

        // Vérifier si le client est aussi un chauffeur
        boolean isDriver = renter.getRoles().stream()
                .anyMatch(r -> r.getName() == ERole.ROLE_DRIVER);
        
        Double discount = isDriver ? 10.0 : 0.0; // 10% de réduction par exemple
        
        Double basePrice = dto.getProposedPrice() != null ? dto.getProposedPrice() : vehicle.getDailyPrice();
        if (basePrice == null) basePrice = 0.0;
        
        // Calculer les jours (simplifié)
        long days = java.time.temporal.ChronoUnit.DAYS.between(dto.getStartDate(), dto.getEndDate());
        if (days <= 0) days = 1;
        
        Double total = basePrice * days;
        Double finalPrice = total - (total * discount / 100);

        RentalContract contract = RentalContract.builder()
                .vehicle(vehicle)
                .renter(renter)
                .owner(vehicle.getOwner())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .proposedPrice(basePrice)
                .driverDiscountPercentage(discount)
                .finalPrice(finalPrice)
                .totalPrice(total)
                .status(RentalStatus.PENDING)
                .paymentStatus("PENDING")
                .pickupLocation(dto.getPickupLocation())
                .returnLocation(dto.getReturnLocation())
                .clientNotes(dto.getMessage() != null ? dto.getMessage() : dto.getClientNotes())
                .createdAt(LocalDateTime.now())
                .build();

        RentalContract saved = rentalRepository.save(contract);
        final Long savedId = saved.getId();
        saved = rentalRepository.findByRenterIdWithDetails(clientId).stream()
                .filter(c -> c.getId().equals(savedId))
                .findFirst()
                .orElse(saved);

        notificationService.createNotification(
                clientId,
                "Demande de location envoyée",
                "Votre demande pour " + vehicle.getBrand() + " " + vehicle.getModel() + " est en attente de validation.",
                "INFO",
                "/client/reservations"
        );

        notificationService.createNotification(
                vehicle.getOwner().getId(),
                "Nouvelle demande de location",
                renter.getFirstName() + " souhaite louer votre " + vehicle.getBrand() + " " + vehicle.getModel() + ".",
                "INFO",
                "/fleet/requests"
        );

        // Log activité pour le propriétaire (Réservation reçue)
        activityService.logActivity(
                vehicle.getOwner(),
                "Réservation reçue",
                "Nouvelle demande de " + renter.getFirstName() + " pour " + vehicle.getBrand(),
                "FLEET",
                "info"
        );

        return saved;
    }

    public List<RentalContract> getOwnerReservations(Long ownerId) {
        return rentalRepository.findByOwnerIdWithDetailsForList(ownerId);
    }

    public List<RentalContract> getClientReservations(Long clientId) {
        return rentalRepository.findByRenterIdWithDetails(clientId);
    }

    public RentalContract respondToReservation(Long ownerId, Long contractId, RentalStatus status, Double newPrice) {
        RentalContract contract = rentalRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrat non trouvé"));

        if (!contract.getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à modifier ce contrat");
        }

        contract.setStatus(status);
        if (newPrice != null) {
            contract.setFinalPrice(newPrice);
        }

        // Si accepté, mettre le véhicule en location
        if (status == RentalStatus.ACCEPTED) {
            Vehicle vehicle = contract.getVehicle();
            vehicle.setStatus(VehicleStatus.RENTED);
            vehicleRepository.save(vehicle);
        } else if (status == RentalStatus.CANCELLED || status == RentalStatus.COMPLETED || status == RentalStatus.REJECTED) {
             Vehicle vehicle = contract.getVehicle();
             vehicle.setStatus(VehicleStatus.AVAILABLE);
             vehicleRepository.save(vehicle);
        }

        RentalContract saved = rentalRepository.save(contract);

        // Log activité pour le propriétaire (Réponse à la réservation)
        String title = status == RentalStatus.ACCEPTED ? "Réservation acceptée" : "Réservation refusée";
        String category = status == RentalStatus.ACCEPTED ? "success" : "danger";
        
        activityService.logActivity(
                contract.getOwner(),
                title,
                "Pour " + contract.getVehicle().getBrand() + " (Client: " + contract.getRenter().getFirstName() + ")",
                "FLEET",
                category
        );

        // Log spécifique si prix négocié
        if (newPrice != null) {
            activityService.logActivity(
                    contract.getOwner(),
                    "Prix négocié",
                    "Nouveau tarif fixé à " + newPrice + " DT pour " + contract.getRenter().getFirstName(),
                    "FLEET",
                    "warning"
            );
        }

        if (contract.getRenter() != null) {
            String vehicleName = contract.getVehicle().getBrand() + " " + contract.getVehicle().getModel();
            if (status == RentalStatus.ACCEPTED) {
                notificationService.createNotification(
                        contract.getRenter().getId(),
                        "Location acceptée",
                        "Votre demande pour " + vehicleName + " a été acceptée par le propriétaire.",
                        "SUCCESS",
                        "/client/reservations"
                );
            } else if (status == RentalStatus.REJECTED) {
                notificationService.createNotification(
                        contract.getRenter().getId(),
                        "Location refusée",
                        "Votre demande pour " + vehicleName + " n'a pas été acceptée.",
                        "WARNING",
                        "/client/reservations"
                );
            }
        }

        return saved;
    }

    public RentalContract cancelReservation(Long clientId, Long contractId) {
        RentalContract contract = rentalRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        if (!contract.getRenter().getId().equals(clientId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à annuler cette réservation");
        }

        if (contract.getStatus() != RentalStatus.PENDING && contract.getStatus() != RentalStatus.ACCEPTED) {
            throw new RuntimeException("Cette réservation ne peut pas être annulée.");
        }

        contract.setStatus(RentalStatus.CANCELLED);
        
        // Si elle était acceptée, libérer le véhicule
        Vehicle vehicle = contract.getVehicle();
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicleRepository.save(vehicle);

        return rentalRepository.save(contract);
    }

    public RentalContract requestExtension(Long clientId, Long contractId, java.time.LocalDate newEndDate) {
        RentalContract contract = rentalRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        if (!contract.getRenter().getId().equals(clientId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à prolonger cette réservation");
        }

        if (contract.getStatus() != RentalStatus.ACTIVE) {
            throw new RuntimeException("Seule une location en cours peut être prolongée.");
        }

        if (!newEndDate.isAfter(contract.getEndDate())) {
            throw new RuntimeException("La nouvelle date de retour doit être après la date actuelle de retour.");
        }

        // Calculer le montant supplémentaire
        long extraDays = java.time.temporal.ChronoUnit.DAYS.between(contract.getEndDate(), newEndDate);
        Double dailyPrice = contract.getVehicle().getDailyPrice();
        if (dailyPrice == null) dailyPrice = 0.0;
        
        contract.setExtensionRequestedEndDate(newEndDate);
        contract.setExtensionStatus("PENDING");
        contract.setExtensionPrice(dailyPrice * extraDays);

        return rentalRepository.save(contract);
    }

    /**
     * Retourne la liste des événements calendrier pour un propriétaire.
     * Utilise JOIN FETCH → une seule requête SQL, aucune LazyInitializationException possible.
     */
    @Transactional(readOnly = true)
    public List<CalendarEventDTO> getCalendarEvents(Long ownerId) {
        // Palette de couleurs identique au frontend Angular (STATUS_COLORS)
        Map<String, String> colorMap = Map.of(
            "PENDING",   "#f59e0b",   // orange
            "ACCEPTED",  "#10b981",   // vert
            "COMPLETED", "#3b82f6",   // bleu
            "REJECTED",  "#ef4444",   // rouge
            "CANCELLED", "#94a3b8"    // gris
        );

        return rentalRepository.findByOwnerIdWithDetails(ownerId)
                .stream()
                .map(r -> {
                    String status = r.getStatus() != null ? r.getStatus().name() : "PENDING";
                    String vehicleName = r.getVehicle().getBrand() + " " + r.getVehicle().getModel();
                    String renterName  = r.getRenter().getFirstName() + " " + r.getRenter().getLastName();

                    return CalendarEventDTO.builder()
                            .reservationId(r.getId())
                            .title(renterName + " — " + vehicleName)
                            .start(r.getStartDate())
                            .end(r.getEndDate())
                            .status(status)
                            .vehicleName(vehicleName)
                            .renterName(renterName)
                            .price(r.getFinalPrice() != null ? r.getFinalPrice() : r.getProposedPrice())
                            .color(colorMap.getOrDefault(status, "#6366f1"))
                            .build();
                })
                .collect(Collectors.toList());
    }

    public com.pfeproject.GoRide.dto.InvoiceDTO getInvoice(Long clientId, Long contractId) {
        RentalContract r = rentalRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        if (!r.getRenter().getId().equals(clientId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à accéder à cette facture");
        }

        if (r.getStatus() != RentalStatus.COMPLETED) {
            throw new RuntimeException("La facture est disponible uniquement pour les réservations terminées.");
        }

        String invoiceNumber = "INV-" + r.getId() + "-" + r.getCreatedAt().getYear();

        return com.pfeproject.GoRide.dto.InvoiceDTO.builder()
                .invoiceNumber(invoiceNumber)
                .reservationId(r.getId())
                .clientName(r.getRenter().getFirstName() + " " + r.getRenter().getLastName())
                .vehicleName(r.getVehicle().getBrand() + " " + r.getVehicle().getModel())
                .ownerName(r.getOwner().getFirstName() + " " + r.getOwner().getLastName())
                .startDate(r.getStartDate())
                .endDate(r.getEndDate())
                .pickupLocation(r.getPickupLocation())
                .returnLocation(r.getReturnLocation())
                .totalPrice(r.getFinalPrice() != null ? r.getFinalPrice() : r.getTotalPrice())
                .depositAmount(r.getVehicle().getDepositAmount())
                .paymentStatus(r.getPaymentStatus())
                .createdAt(LocalDateTime.now())
                .status(r.getStatus().name())
                .build();
    }
}
