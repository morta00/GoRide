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
public class RideRequestResponseDto {
    private Long id;
    private String departure;
    private String destination;
    private String rideType;
    private Integer passengers;
    private String paymentMethod;
    private Double estimatedPrice;
    private String comment;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime acceptedAt;
    
    // Client info
    private Long clientId;
    private String clientName;
    private String clientEmail;
    private String clientPhone;
    private String clientPhoto;
    
    // Driver info
    private Long driverId;
    private String driverName;
    private String driverEmail;
    private String driverPhone;
    private String driverPhoto;
    private String vehicleModel;
}
