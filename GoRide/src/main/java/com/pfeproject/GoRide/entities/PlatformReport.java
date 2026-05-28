package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "platform_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false, unique = true, length = 40)
    private String caseId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reporter_name", nullable = false)
    private String reporterName;

    @Column(name = "reporter_role", nullable = false, length = 40)
    private String reporterRole;

    @Column(name = "reported_name", nullable = false)
    private String reportedName;

    @Column(name = "reported_role", nullable = false, length = 40)
    private String reportedRole;

    @Column(name = "report_type", nullable = false, length = 40)
    private String reportType;

    @Column(nullable = false, length = 20)
    private String priority;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "related_entity_type", length = 30)
    private String relatedEntityType;

    @Column(name = "related_service_id", length = 60)
    private String relatedServiceId;

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
