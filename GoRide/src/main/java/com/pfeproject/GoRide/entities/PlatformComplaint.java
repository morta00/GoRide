package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "platform_complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformComplaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false, unique = true, length = 40)
    private String caseId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "complainant_name", nullable = false)
    private String complainantName;

    @Column(name = "complainant_role", nullable = false, length = 40)
    private String complainantRole;

    @Column(name = "accused_name", nullable = false)
    private String accusedName;

    @Column(name = "accused_role", nullable = false, length = 40)
    private String accusedRole;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "related_service_id", length = 60)
    private String relatedServiceId;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "demo_marker", length = 40)
    private String demoMarker;
}
