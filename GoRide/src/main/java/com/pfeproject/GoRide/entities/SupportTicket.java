package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false, unique = true, length = 40)
    private String caseId;

    @Column(nullable = false)
    private String subject;

    @Column(name = "requester_name", nullable = false)
    private String requesterName;

    @Column(name = "requester_role", nullable = false, length = 40)
    private String requesterRole;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "demo_marker", length = 40)
    private String demoMarker;
}
