package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

/**
 * Entité représentant un véhicule sur la plateforme GoRide.
 * Un véhicule appartient à un propriétaire de flotte et peut être assigné à un
 * chauffeur.
 */
@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String brand;

    @Column(nullable = false, length = 50)
    private String model;

    @Column(name = "license_plate", nullable = false, unique = true, length = 20)
    private String licensePlate;

    @Column(name = "production_year")
    private Integer year;

    @Column(length = 20)
    private String transmission; // Manuelle, Automatique

    @Column(length = 100)
    private String location;

    /** Latitude for map display (Tunisia cities, etc.) */
    @Column(name = "latitude")
    private Double latitude;

    /** Longitude for map display */
    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "daily_price")
    private Double dailyPrice;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private VehicleStatus status = VehicleStatus.AVAILABLE;

    @Column(nullable = false)
    @Builder.Default
    private Integer seats = 4;

    @Column(name = "has_wifi")
    @Builder.Default
    private Boolean hasWifi = false;

    @Column(name = "has_baby_seat")
    @Builder.Default
    private Boolean hasBabySeat = false;

    @Column(name = "luggage_capacity")
    @Builder.Default
    private Integer luggageCapacity = 2;

    @Column(name = "fuel_type", length = 20)
    private String fuelType;

    @Column(length = 30)
    private String color;

    @Column(name = "has_ac")
    @Builder.Default
    private Boolean hasAC = true;

    @Column(name = "mileage")
    private Integer mileage;

    @Column(length = 30)
    private String category; // STANDARD, LUXE, etc.

    @Column(name = "insurance_info")
    private String insuranceInfo;

    @Column(name = "deposit_amount")
    private Double depositAmount;

    @Column(length = 50)
    private String consumption;

    @Builder.Default
    private Boolean available = true;

    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "rating")
    @Builder.Default
    private Double rating = 0.0;

    // Le propriétaire du véhicule (Fleet Owner)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    @JsonIgnoreProperties({ "roles", "password", "hasFleet", "enabled", "createdAt" })
    private UserEntity owner;

    // Le chauffeur actuellement assigné
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    @JsonIgnoreProperties({ "roles", "password", "hasFleet", "enabled", "createdAt" })
    private UserEntity driver;

    // --- RELATIONS POUR LA SUPPRESSION EN CASCADE ---

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<RentalContract> rentalContracts;

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Trip> trips;

    @OneToMany(mappedBy = "vehicle", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Conversation> conversations;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }
    public VehicleStatus getStatus() { return status; }
    public void setStatus(VehicleStatus status) { this.status = status; }
    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
}
