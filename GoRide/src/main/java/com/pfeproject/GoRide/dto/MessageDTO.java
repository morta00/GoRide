package com.pfeproject.GoRide.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
    private Boolean isRead;
    /** true si le message a été envoyé par l'utilisateur qui consulte la conversation */
    private Boolean mine;
}
