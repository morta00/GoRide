package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.FleetConversationDTO;
import com.pfeproject.GoRide.dto.MessageDTO;
import com.pfeproject.GoRide.entities.Conversation;
import com.pfeproject.GoRide.entities.Message;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.entities.Role;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.MessagingService;
import com.pfeproject.GoRide.repositories.ConversationRepository;
import com.pfeproject.GoRide.repositories.MessageRepository;
import com.pfeproject.GoRide.repositories.RideRequestRepository;
import com.pfeproject.GoRide.entities.RideRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ConversationController {

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<FleetConversationDTO>> getFleetConversations(
            @RequestParam(value = "context", required = false) String context,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<Conversation> conversations = conversationRepository.findAllByUserId(userId);
        if (context != null && !context.isEmpty()) {
            conversations = conversations.stream()
                    .filter(c -> {
                        String ctx = c.getContext() != null ? c.getContext() : "";
                        if ("RIDE".equalsIgnoreCase(context)) {
                            return "RIDE".equalsIgnoreCase(ctx) || "RIDE_REQUEST".equalsIgnoreCase(ctx);
                        }
                        if ("RENTAL".equalsIgnoreCase(context) || "FLEET".equalsIgnoreCase(context)) {
                            return ctx.toUpperCase().contains("RENTAL");
                        }
                        return context.equalsIgnoreCase(ctx);
                    })
                    .collect(Collectors.toList());
        }

        List<FleetConversationDTO> dtos = conversations.stream().map(c -> {
            UserEntity other = c.getOwner().getId().equals(userId) ? c.getClient() : c.getOwner();
            Message lastMsg = messageRepository.findFirstByConversationIdOrderByTimestampDesc(c.getId());

            String convContext = c.getContext() != null ? c.getContext() : "RENTAL";
            String fleetContext = toFleetUiContext(convContext, c, userId);

            String roleName = "ROLE_CLIENT";
            String roleLabel = "Passager";
            if (other.getRoles() != null && !other.getRoles().isEmpty()) {
                roleName = other.getRoles().stream()
                        .map(Role::getName)
                        .findFirst()
                        .map(Enum::name)
                        .orElse("ROLE_CLIENT");
            }

            if ("RIDE_REQUEST".equalsIgnoreCase(convContext) || "RIDE".equalsIgnoreCase(convContext)) {
                if (c.getOwner().getId().equals(other.getId())) {
                    roleName = "ROLE_DRIVER";
                    roleLabel = "Chauffeur";
                } else {
                    roleName = "ROLE_USER";
                    roleLabel = "Passager";
                }
            } else if (c.getVehicle() != null && c.getVehicle().getOwner() != null && c.getVehicle().getOwner().getId().equals(other.getId())) {
                roleName = "ROLE_FLEET_OWNER";
                roleLabel = "Propriétaire";
            } else if (c.getOwner().getId().equals(other.getId()) && other.getRoles().stream().anyMatch(r -> r.getName().name().contains("FLEET"))) {
                roleName = "ROLE_FLEET_OWNER";
                roleLabel = "Propriétaire";
            } else if (roleName.equals("ROLE_FLEET_OWNER")) {
                roleLabel = "Propriétaire";
            } else if (roleName.equals("ROLE_DRIVER")) {
                roleLabel = "Chauffeur";
            } else if (roleName.equals("ROLE_ADMIN")) {
                roleLabel = "Support";
            } else if (roleName.equals("ROLE_CLIENT")) {
                if ("RENTAL".equalsIgnoreCase(convContext)) {
                    roleLabel = "Locataire";
                } else {
                    roleLabel = "Passager";
                }
            }

            String vehicleLabel = "Général";
            String tripRoute = null;
            if (c.getVehicle() != null) {
                vehicleLabel = c.getVehicle().getBrand() + " " + c.getVehicle().getModel();
            } else if (isRideContext(convContext) && c.getBookingId() != null) {
                tripRoute = resolveTripRoute(c.getBookingId());
                vehicleLabel = tripRoute != null ? tripRoute : ("Course #" + c.getBookingId());
            }

            return FleetConversationDTO.builder()
                    .id(c.getId())
                    .context(fleetContext)
                    .participantId(other.getId())
                    .participantName(other.getFirstName() + " " + other.getLastName())
                    .participantRole(roleName)
                    .participantRoleLabel(roleLabel)
                    .vehicleId(c.getVehicle() != null ? c.getVehicle().getId() : null)
                    .vehicleName(vehicleLabel)
                    .tripRoute(tripRoute)
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : "Aucun message")
                    .unreadCount(messageRepository.countUnreadMessages(c.getId(), userId))
                    .updatedAt(lastMsg != null ? lastMsg.getTimestamp() : c.getCreatedAt())
                    .bookingId(c.getBookingId())
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/start")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FleetConversationDTO> startConversation(
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long clientId = userDetails.getId();

        Long participantId = ((Number) payload.get("participantId")).longValue();
        String context = payload.get("context") != null ? payload.get("context").toString() : "RENTAL_CLIENT";
        Long vehicleId = payload.get("vehicleId") != null ? ((Number) payload.get("vehicleId")).longValue() : null;
        Long bookingId = payload.get("bookingId") != null ? ((Number) payload.get("bookingId")).longValue() : null;
        if (bookingId == null && payload.get("rideId") != null) {
            bookingId = ((Number) payload.get("rideId")).longValue();
        }

        Conversation conv;
        if ("RIDE".equalsIgnoreCase(context) || "RIDE_REQUEST".equalsIgnoreCase(context)) {
            // owner = chauffeur, client = passager (même convention qu'à l'acceptation)
            boolean currentIsDriver = userDetails.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_DRIVER".equals(a.getAuthority()));
            Long driverId = currentIsDriver ? clientId : participantId;
            Long passengerId = currentIsDriver ? participantId : clientId;
            conv = messagingService.createOrGetRideConversation(driverId, passengerId, bookingId);
        } else {
            boolean isFleetOwner = userDetails.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_FLEET_OWNER".equals(a.getAuthority()));
            Long ownerId;
            Long renterClientId;
            if (isFleetOwner) {
                ownerId = clientId;
                renterClientId = participantId;
            } else {
                ownerId = participantId;
                renterClientId = clientId;
            }
            String rentalContext = (context != null && !context.isBlank()) ? context : "RENTAL";
            conv = messagingService.createOrGetConversation(
                    ownerId, renterClientId, vehicleId, bookingId, rentalContext);
        }

        UserEntity other = conv.getOwner().getId().equals(clientId) ? conv.getClient() : conv.getOwner();

        String roleName = "ROLE_CLIENT";
        String roleLabel = "Passager";
        if (other.getRoles() != null && !other.getRoles().isEmpty()) {
            roleName = other.getRoles().stream()
                    .map(Role::getName)
                    .findFirst()
                    .map(Enum::name)
                    .orElse("ROLE_CLIENT");
        }

        if (conv.getOwner().getId().equals(other.getId())
                && other.getRoles() != null
                && other.getRoles().stream().anyMatch(r -> r.getName().name().contains("FLEET"))) {
            roleName = "ROLE_FLEET_OWNER";
            roleLabel = "Propriétaire";
        } else if (roleName.equals("ROLE_FLEET_OWNER")) {
            roleLabel = "Propriétaire";
        } else if (roleName.equals("ROLE_DRIVER")) {
            roleLabel = "Chauffeur";
        } else if (roleName.equals("ROLE_ADMIN")) {
            roleLabel = "Support";
        } else if (roleName.equals("ROLE_CLIENT")) {
            if ("RENTAL".equalsIgnoreCase(conv.getContext())) {
                roleLabel = "Locataire";
            } else {
                roleLabel = "Passager";
            }
        }

        FleetConversationDTO dto = FleetConversationDTO.builder()
                .id(conv.getId())
                .context(conv.getContext())
                .participantId(other.getId())
                .participantName(other.getFirstName() + " " + other.getLastName())
                .participantRole(roleName)
                .participantRoleLabel(roleLabel)
                .vehicleId(conv.getVehicle() != null ? conv.getVehicle().getId() : null)
                .vehicleName(conv.getVehicle() != null ? conv.getVehicle().getBrand() + " " + conv.getVehicle().getModel() : null)
                .bookingId(conv.getBookingId())
                .build();

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MessageDTO>> getMessages(@PathVariable Long id, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(messagingService.getConversationMessages(id, userDetails.getId()));
    }

    @PostMapping("/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageDTO> postMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String content = payload.get("content");

        Message msg = messagingService.sendMessage(id, userDetails.getId(), content);
        return ResponseEntity.ok(messagingService.convertToMessageDTO(msg, userDetails.getId()));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> putMarkAsRead(@PathVariable Long id, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        messagingService.markAsRead(id, userDetails.getId());

        Conversation conv = messagingService.getConversationEntity(id);
        Long otherId = conv.getOwner().getId().equals(userDetails.getId()) ? conv.getClient().getId()
                : conv.getOwner().getId();

        Map<String, Object> readEvent = new HashMap<>();
        readEvent.put("conversationId", id);
        readEvent.put("readerId", userDetails.getId());
        readEvent.put("status", "READ");

        messagingTemplate.convertAndSendToUser(otherId.toString(), "/queue/notifications", readEvent);

        return ResponseEntity.ok().build();
    }

    /** Contexte affiché dans la messagerie propriétaire (onglets Locataires / Chauffeurs / Support). */
    private static String toFleetUiContext(String convContext, Conversation c, Long viewerUserId) {
        String ctx = convContext != null ? convContext.toUpperCase() : "RENTAL";
        if (ctx.contains("RENTAL")) {
            return c.getOwner().getId().equals(viewerUserId) ? "RENTAL_CLIENT" : "DRIVER_RENTAL";
        }
        if (isRideContext(ctx)) {
            return "DRIVER_RENTAL";
        }
        if (ctx.contains("SUPPORT") || ctx.contains("ADMIN")) {
            return "SUPPORT";
        }
        return "RENTAL_CLIENT";
    }

    private static boolean isRideContext(String convContext) {
        if (convContext == null) {
            return false;
        }
        String ctx = convContext.toUpperCase();
        return "RIDE".equals(ctx) || "RIDE_REQUEST".equals(ctx);
    }

    private String resolveTripRoute(Long rideRequestId) {
        if (rideRequestId == null) {
            return null;
        }
        return rideRequestRepository.findById(rideRequestId)
                .map(r -> trimRoute(r.getDeparture()) + " → " + trimRoute(r.getDestination()))
                .orElse(null);
    }

    private static String trimRoute(String value) {
        if (value == null || value.isBlank()) {
            return "—";
        }
        return value.trim();
    }
}
