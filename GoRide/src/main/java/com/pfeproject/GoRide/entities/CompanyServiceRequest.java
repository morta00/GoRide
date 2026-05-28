package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "company_service_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyServiceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type")
    private String type; // VEHICLE_RENTAL, DRIVER_WITH_CAR, CUSTOM_REQUEST

    @Column(name = "target_role")
    private String targetRole; // OWNER, DRIVER, etc.

    @Column(name = "company_id")
    private Long companyId;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "vehicle_name")
    private String vehicleName;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "driver_name")
    private String driverName;

    @Column(name = "requested_quantity")
    private Integer requestedQuantity;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "city")
    private String city;

    @Column(name = "budget")
    private Double budget;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "status")
    private String status; // PENDING_OWNER, PENDING_DRIVER, ACCEPTED, REJECTED, CANCELLED, CONFIRMED, IN_PROGRESS, COMPLETED

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "mission_type")
    private String missionType;

    @Column(name = "start_time")
    private String startTime;

    @Column(name = "estimated_passengers")
    private Integer estimatedPassengers;

    @Column(name = "price_per_day")
    private Double pricePerDay;

    @Column(name = "need_type")
    private String needType;

    @Column(name = "vehicles_count")
    private Integer vehiclesCount;

    @Column(name = "drivers_count")
    private Integer driversCount;

    @Column(name = "vehicle_type")
    private String vehicleType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "contact_person")
    private String contactPerson;
}
