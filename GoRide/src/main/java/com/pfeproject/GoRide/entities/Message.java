package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entité représentant un message au sein d'une conversation.
 */
@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    @JsonIgnoreProperties({"messages", "hibernateLazyInitializer", "handler"})
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "roles", "password", "enabled", "createdAt", "resetToken", "resetTokenExpiration", "lastPasswordUpdate", "twoFactorSecret", "twoFactorTempSecret"})
    private UserEntity sender;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "timestamp")
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;
}
