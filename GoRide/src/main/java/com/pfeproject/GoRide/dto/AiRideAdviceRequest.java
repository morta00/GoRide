package com.pfeproject.GoRide.dto;

import lombok.Data;

@Data
public class AiRideAdviceRequest {
    private String preference;
    private String departure;
    private String destination;
    private String rideType;
    private Integer passengers;
    private String locale;
}
