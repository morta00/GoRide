package com.pfeproject.GoRide.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FleetConversationDTO {
    private Long id;
    private String context; // RENTAL_CLIENT, DRIVER_RENTAL, SUPPORT
    private Long participantId;
    private String participantName;
    private String participantRole; // ROLE_CLIENT, ROLE_DRIVER, ROLE_ADMIN
    private String participantRoleLabel;
    private Long vehicleId;
    private String vehicleName;
    private String lastMessage;
    private long unreadCount;
    private LocalDateTime updatedAt;
    private Long bookingId;
    /** Départ → destination pour les courses (RIDE / RIDE_REQUEST). */
    private String tripRoute;
}
