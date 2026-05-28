package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.*;

/**
 * DTO pour la réservation d'un trajet par un passager.
 */
public class BookingDTO {

    @NotNull(message = "L'ID du trajet est obligatoire")
    private Long tripId;

    @Min(value = 1, message = "Au moins 1 siège requis")
    private Integer seatsBooked = 1;

    public BookingDTO() {}

    public Long getTripId() { return tripId; }
    public void setTripId(Long tripId) { this.tripId = tripId; }

    public Integer getSeatsBooked() { return seatsBooked; }
    public void setSeatsBooked(Integer seatsBooked) { this.seatsBooked = seatsBooked; }
}
