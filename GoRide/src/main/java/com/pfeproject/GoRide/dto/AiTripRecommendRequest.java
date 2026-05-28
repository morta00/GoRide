package com.pfeproject.GoRide.dto;

import lombok.Data;

@Data
public class AiTripRecommendRequest {
    /** comfort (chauffeur/véhicule premium) | economy | family (groupe) | flexible (départ proche, places dispo) */
    private String preference;
    private String departure;
    private String destination;
    private Integer passengers;
    private String locale;
}
