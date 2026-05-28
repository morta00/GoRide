package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.RideRequestResponseDto;
import com.pfeproject.GoRide.entities.ERole;
import com.pfeproject.GoRide.entities.RideRequest;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.ConversationRepository;
import com.pfeproject.GoRide.repositories.RideRequestRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RideRequestService {

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private UserRepo userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private ConversationRepository conversationRepository;

    /**
     * Détail d'une course pour les participants ou toute personne liée via une conversation (ex. propriétaire).
     */
    public RideRequestResponseDto getRequestForViewer(Long requestId, Long userId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Course introuvable"));

        boolean allowed = false;
        if (request.getClient() != null && request.getClient().getId().equals(userId)) {
            allowed = true;
        }
        if (request.getDriver() != null && request.getDriver().getId().equals(userId)) {
            allowed = true;
        }
        if (!allowed && conversationRepository.existsByUserIdAndBookingId(userId, requestId)) {
            allowed = true;
        }
        if (!allowed) {
            throw new RuntimeException("Accès refusé à cette course");
        }
        return mapToDto(request);
    }

    public RideRequestResponseDto createRequest(RideRequest request, Long clientId) {
        UserEntity client = userRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));
        request.setClient(client);
        request.setStatus("PENDING");
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        RideRequest saved = rideRequestRepository.save(request);

        notificationService.createNotification(
                clientId,
                "Demande envoyée",
                "Votre course " + request.getDeparture() + " → " + request.getDestination() + " est en attente d'un chauffeur.",
                "INFO",
                "/client/current-ride"
        );

        String rideSummary = request.getDeparture() + " → " + request.getDestination();
        userRepository.findAll().stream()
                .filter(u -> u.getRoles() != null && u.getRoles().stream()
                        .anyMatch(r -> r.getName() == ERole.ROLE_DRIVER))
                .forEach(driver -> notificationService.createNotification(
                        driver.getId(),
                        "Nouvelle demande de course",
                        "Course disponible : " + rideSummary + ". Consultez Demandes reçues.",
                        "INFO",
                        "/driver/requests"
                ));

        return mapToDto(saved);
    }

    public List<RideRequestResponseDto> getClientRequests(Long clientId) {
        UserEntity client = userRepository.findById(clientId).orElse(null);
        List<RideRequest> requests = rideRequestRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        System.out.println("[DEBUG] getMyRideRequests - User: " + (client != null ? client.getEmail() : clientId) + " - Found: " + requests.size());
        return requests.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public RideRequestResponseDto getCurrentClientRide(Long clientId) {
        UserEntity client = userRepository.findById(clientId).orElse(null);
        List<RideRequest> currentRides = rideRequestRepository.findCurrentRidesByClientId(clientId);
        RideRequest found = currentRides.isEmpty() ? null : currentRides.get(0);
        System.out.println("[DEBUG] getCurrentRide - User: " + (client != null ? client.getEmail() : clientId) + " - Found ID: " + (found != null ? found.getId() : "None"));
        return found != null ? mapToDto(found) : null;
    }

    public List<RideRequestResponseDto> getPendingRequests() {
        List<RideRequest> pending = rideRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING");
        return pending.stream()
                .filter(r -> r.getDriver() == null)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RideRequestResponseDto acceptRequest(Long requestId, Long driverId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Ride request not found"));
        
        if (!"PENDING".equals(request.getStatus())) {
            throw new RuntimeException("Request is no longer pending");
        }
 
        UserEntity driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
 
        request.setDriver(driver);
        request.setStatus("ACCEPTED");
        request.setAcceptedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        
        RideRequest saved = rideRequestRepository.save(request);

        Long passengerId = request.getClient().getId();
        com.pfeproject.GoRide.entities.Conversation chat =
                messagingService.createOrGetRideConversation(driverId, passengerId, saved.getId());

        try {
            messagingService.sendMessage(
                    chat.getId(),
                    driverId,
                    "Bonjour ! J'ai accepté votre course " + request.getDeparture() + " → " + request.getDestination() + ". Vous pouvez me répondre ici."
            );
        } catch (Exception ignored) {
            // non-blocking
        }

        if (request.getClient() != null) {
            String driverName = driver.getFirstName() + " " + driver.getLastName();
            notificationService.createNotification(
                request.getClient().getId(),
                "Chauffeur trouvé",
                driverName + " a accepté votre course " + request.getDeparture() + " → " + request.getDestination() + ". Ouvrez Conversations pour discuter.",
                "SUCCESS",
                "/client/conversations?rideId=" + saved.getId() + "&driverId=" + driverId
            );
        }

        return mapToDto(saved);
    }

    @Transactional
    public RideRequestResponseDto rejectRequest(Long requestId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Ride request not found"));
        request.setStatus("REJECTED");
        request.setUpdatedAt(LocalDateTime.now());
        RideRequest saved = rideRequestRepository.save(request);
        notifyClientRideUpdate(saved, "Course refusée",
                "Aucun chauffeur n'a pu prendre votre course. Vous pouvez réessayer.",
                "WARNING");
        return mapToDto(saved);
    }

    @Transactional
    public RideRequestResponseDto startRequest(Long requestId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Ride request not found"));
        request.setStatus("IN_PROGRESS");
        request.setUpdatedAt(LocalDateTime.now());
        RideRequest saved = rideRequestRepository.save(request);
        notifyClientRideUpdate(saved, "Course démarrée",
                "Votre chauffeur est en route / la course a commencé.",
                "SUCCESS");
        return mapToDto(saved);
    }

    @Transactional
    public RideRequestResponseDto completeRequest(Long requestId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Ride request not found"));
        request.setStatus("COMPLETED");
        request.setUpdatedAt(LocalDateTime.now());
        RideRequest saved = rideRequestRepository.save(request);
        notifyClientRideUpdate(saved, "Course terminée",
                "Votre course est terminée. Merci d'avoir voyagé avec GoRide !",
                "SUCCESS");
        return mapToDto(saved);
    }

    @Transactional
    public RideRequestResponseDto cancelRequest(Long requestId) {
        RideRequest request = rideRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Ride request not found"));
        request.setStatus("CANCELLED");
        request.setUpdatedAt(LocalDateTime.now());
        RideRequest saved = rideRequestRepository.save(request);
        notifyClientRideUpdate(saved, "Course annulée",
                "La course a été annulée.",
                "WARNING");
        return mapToDto(saved);
    }

    private void notifyClientRideUpdate(RideRequest request, String title, String message, String type) {
        if (request.getClient() != null) {
            notificationService.createNotification(
                    request.getClient().getId(),
                    title,
                    message,
                    type,
                    "/client/current-ride"
            );
        }
    }

    public List<RideRequestResponseDto> getAllRequests() {
        List<RideRequest> all = rideRequestRepository.findAll();
        System.out.println("[DEBUG] getAdminRideServices - Total Found: " + all.size());
        return all.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private RideRequestResponseDto mapToDto(RideRequest r) {
        RideRequestResponseDto dto = new RideRequestResponseDto();
        dto.setId(r.getId());
        dto.setDeparture(r.getDeparture());
        dto.setDestination(r.getDestination());
        dto.setRideType(r.getRideType());
        dto.setPassengers(r.getPassengers());
        dto.setPaymentMethod(r.getPaymentMethod());
        dto.setEstimatedPrice(r.getEstimatedPrice());
        dto.setComment(r.getComment());
        dto.setStatus(r.getStatus());
        dto.setCreatedAt(r.getCreatedAt());
        dto.setUpdatedAt(r.getUpdatedAt());
        dto.setAcceptedAt(r.getAcceptedAt());

        if (r.getClient() != null) {
            dto.setClientId(r.getClient().getId());
            String firstName = r.getClient().getFirstName();
            String lastName = r.getClient().getLastName();
            String clientName = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
            if (clientName.isEmpty() || "null null".equalsIgnoreCase(clientName) || "null".equalsIgnoreCase(clientName)) {
                clientName = r.getClient().getEmail();
            }
            if (clientName == null || clientName.isEmpty()) {
                clientName = "Client Inconnu";
            }
            dto.setClientName(clientName);
            dto.setClientEmail(r.getClient().getEmail());
            dto.setClientPhone(r.getClient().getPhone());
            dto.setClientPhoto(r.getClient().getPhotoUrl());
        } else {
            dto.setClientName("Client supprimé");
        }

        if (r.getDriver() != null) {
            dto.setDriverId(r.getDriver().getId());
            dto.setDriverName(r.getDriver().getFirstName() + " " + r.getDriver().getLastName());
            dto.setDriverEmail(r.getDriver().getEmail());
            dto.setDriverPhone(r.getDriver().getPhone());
            dto.setDriverPhoto(r.getDriver().getPhotoUrl());
            // vehicleModel could be fetched from a Vehicle relation if it existed in UserEntity or separate profile
        }

        return dto;
    }
}
