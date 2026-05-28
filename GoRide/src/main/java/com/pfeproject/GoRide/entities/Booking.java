package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entité représentant une réservation de trajet par un passager.
 */
@Entity
@Table(name = "bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seats_booked", nullable = false)
    @Builder.Default
    private Integer seatsBooked = 1;

    @Column(name = "total_price")
    private Double totalPrice;

    @Column(length = 20)
    @Builder.Default
    private String status = "PENDING_DRIVER"; // PENDING_DRIVER, CONFIRMED, CANCELLED, COMPLETED

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Le trajet réservé
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    @JsonIgnoreProperties(value = {"bookings", "driver", "vehicle", "hibernateLazyInitializer", "handler"})
    private Trip trip;

    // Le passager qui réserve
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    @JsonIgnoreProperties({"roles", "password", "hasFleet", "enabled", "createdAt"})
    private UserEntity passenger;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getSeatsBooked() { return seatsBooked; }
    public void setSeatsBooked(Integer seatsBooked) { this.seatsBooked = seatsBooked; }
    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Trip getTrip() { return trip; }
    public void setTrip(Trip trip) { this.trip = trip; }
    public UserEntity getPassenger() { return passenger; }
    public void setPassenger(UserEntity passenger) { this.passenger = passenger; }
}
