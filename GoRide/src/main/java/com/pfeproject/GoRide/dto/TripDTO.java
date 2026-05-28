package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/**
 * DTO pour la création d'un trajet par un chauffeur.
 */
public class TripDTO {

    @NotBlank(message = "Le lieu de départ est obligatoire")
    private String departure;

    @NotBlank(message = "La destination est obligatoire")
    private String destination;

    @NotNull(message = "L'heure de départ est obligatoire")
    private LocalDateTime departureTime;

    @Min(value = 1, message = "Au moins 1 place disponible requise")
    @Max(value = 8, message = "Maximum 8 places")
    private Integer availableSeats = 3;

    @NotNull(message = "Le prix par place est obligatoire")
    @DecimalMin(value = "0.0", message = "Le prix ne peut pas être négatif")
    private Double pricePerSeat;

    private String notes;
    private Long vehicleId; // optionnel

    public TripDTO() {}

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

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }
}
