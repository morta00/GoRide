package com.pfeproject.GoRide.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationDTO {
    private Long id;
    private Long ownerId;
    private Long clientId;
    private String otherParticipantName;
    private String otherParticipantPhoto;
    private Long vehicleId;
    private String vehicleName;
    private String lastMessage;
    private LocalDateTime lastMessageTimestamp;
    private long unreadCount;
}
