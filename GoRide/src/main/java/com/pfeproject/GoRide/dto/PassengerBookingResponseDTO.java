package com.pfeproject.GoRide.dto;

import com.pfeproject.GoRide.entities.Booking;
import com.pfeproject.GoRide.entities.Trip;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.entities.Vehicle;

import java.time.LocalDateTime;

/**
 * Réservation trajet partagé — réponse plate pour le client (évite lazy-load / cycles JSON).
 */
public class PassengerBookingResponseDTO {

    private Long id;
    private Integer seatsBooked;
    private Double totalPrice;
    private String status;
    private LocalDateTime createdAt;

    private Long tripId;
    private String departure;
    private String destination;
    private LocalDateTime departureTime;
    private String tripStatus;

    private Long driverId;
    private String driverFirstName;
    private String driverLastName;
    private String vehicleModel;

    private Long passengerId;
    private String passengerFirstName;
    private String passengerLastName;
    private String passengerEmail;

    public static PassengerBookingResponseDTO from(Booking b) {
        PassengerBookingResponseDTO dto = new PassengerBookingResponseDTO();
        dto.id = b.getId();
        dto.seatsBooked = b.getSeatsBooked();
        dto.totalPrice = b.getTotalPrice();
        dto.status = b.getStatus();
        dto.createdAt = b.getCreatedAt();

        Trip t = b.getTrip();
        if (t != null) {
            dto.tripId = t.getId();
            dto.departure = t.getDeparture();
            dto.destination = t.getDestination();
            dto.departureTime = t.getDepartureTime();
            dto.tripStatus = t.getStatus();
            UserEntity driver = t.getDriver();
            if (driver != null) {
                dto.driverId = driver.getId();
                dto.driverFirstName = driver.getFirstName();
                dto.driverLastName = driver.getLastName();
            }
            Vehicle v = t.getVehicle();
            if (v != null) {
                dto.vehicleModel = v.getModel() != null ? v.getModel() : v.getBrand();
            }
        }
        UserEntity passenger = b.getPassenger();
        if (passenger != null) {
            dto.passengerId = passenger.getId();
            dto.passengerFirstName = passenger.getFirstName();
            dto.passengerLastName = passenger.getLastName();
            dto.passengerEmail = passenger.getEmail();
        }
        return dto;
    }

    public Long getId() { return id; }
    public Integer getSeatsBooked() { return seatsBooked; }
    public Double getTotalPrice() { return totalPrice; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Long getTripId() { return tripId; }
    public String getDeparture() { return departure; }
    public String getDestination() { return destination; }
    public LocalDateTime getDepartureTime() { return departureTime; }
    public String getTripStatus() { return tripStatus; }
    public Long getDriverId() { return driverId; }
    public String getDriverFirstName() { return driverFirstName; }
    public String getDriverLastName() { return driverLastName; }
    public String getVehicleModel() { return vehicleModel; }
    public Long getPassengerId() { return passengerId; }
    public String getPassengerFirstName() { return passengerFirstName; }
    public String getPassengerLastName() { return passengerLastName; }
    public String getPassengerEmail() { return passengerEmail; }
}
