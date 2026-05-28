package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entité représentant un trajet proposé par un chauffeur.
 * Un chauffeur peut créer des trajets que les clients peuvent réserver.
 */
@Entity
@Table(name = "trips")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String departure;

    @Column(nullable = false, length = 100)
    private String destination;

    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;

    @Column(name = "available_seats", nullable = false)
    @Builder.Default
    private Integer availableSeats = 3;

    @Column(name = "price_per_seat", nullable = false)
    private Double pricePerSeat;

    @Column(length = 20)
    @Builder.Default
    private String status = "AVAILABLE"; // AVAILABLE, FULL, CANCELLED, COMPLETED

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Le chauffeur qui propose le trajet
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    @JsonIgnoreProperties({"roles", "password", "hasFleet", "enabled", "createdAt"})
    private UserEntity driver;

    // Le véhicule utilisé pour le trajet
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    @JsonIgnoreProperties({"owner", "driver"})
    private Vehicle vehicle;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private java.util.List<Booking> bookings;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDeparture() { return departure; }
    public void setDeparture(String departure) { this.departure = departure; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public LocalDateTime getDepartureTime() { return departureTime; }
    public void setDepartureTime(LocalDateTime departureTime) { this.departureTime = departureTime; }
    public Integer getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(Integer availableSeats) { this.availableSeats = availableSeats; }
    public Double getPricePerSeat() { return pricePerSeat; }
    public void setPricePerSeat(Double pricePerSeat) { this.pricePerSeat = pricePerSeat; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UserEntity getDriver() { return driver; }
    public void setDriver(UserEntity driver) { this.driver = driver; }
}
