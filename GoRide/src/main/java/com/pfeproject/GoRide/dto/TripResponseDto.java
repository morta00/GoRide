package com.pfeproject.GoRide.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripResponseDto {
    private Long id;
    private String departure;
    private String destination;
    private LocalDateTime departureTime;
    private Integer availableSeats;
    private Double pricePerSeat;
    private String status;
    private String notes;
    private LocalDateTime createdAt;
    
    // Driver info
    private Long driverId;
    private String driverName;
    private String driverPhoto;
    private Double driverRating;
    
    // Vehicle info
    private Long vehicleId;
    private String vehicleName;
    private String vehiclePlate;
}
