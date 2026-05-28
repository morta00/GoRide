package com.pfeproject.GoRide.dto;

import lombok.Data;

@Data
public class AiVehicleRecommendRequest {
    /** comfort (luxe, auto) | economy | family | long_trip (autoroute/SUV) | eco | flexible (prix modéré) */
    private String preference;
    private String location;
    private String startDate;
    private String endDate;
    private Integer passengers;
    private String locale;
    /** Filtres alignés sur la page location client */
    private String brand;
    private Double maxPrice;
    private String transmission;
    /** Si fourni, l'IA ne choisit que parmi ces véhicules (liste filtrée côté client) */
    private java.util.List<Long> vehicleIds;
}
