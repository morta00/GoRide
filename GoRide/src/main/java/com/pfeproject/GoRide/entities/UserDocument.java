package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // CIN, LICENSE, INSURANCE, etc.

    @Column(nullable = false)
    private String status; // verified, pending, rejected, missing

    @Column(name = "expiry_date")
    private String expiryDate;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;
}
