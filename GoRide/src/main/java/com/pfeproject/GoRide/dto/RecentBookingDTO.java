package com.pfeproject.GoRide.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO pour afficher une réservation récente dans le dashboard propriétaire.
 * Contient toutes les infos de prix, statut, badges client/chauffeur.
 */
public class RecentBookingDTO {

    private Long id;

    // Infos client
    private String renterFirstName;
    private String renterLastName;
    private String renterEmail;
    private boolean renterIsDriver; // badge CHAUFFEUR

    // Infos véhicule
    private String vehicleBrand;
    private String vehicleModel;
    private String vehicleLicensePlate;

    // Dates
    private LocalDate startDate;
    private LocalDate endDate;

    // Prix
    private Double initialPrice;       // prix de base du véhicule (dailyPrice × jours)
    private Double proposedPrice;      // prix proposé par le client
    private Double driverDiscount;     // % de réduction chauffeur
    private Double finalPrice;         // prix final accepté
    private boolean priceNegotiated;   // badge "Prix négocié"

    // Statut
    private String status;             // PENDING, ACCEPTED, REJECTED, CANCELLED

    // Notes client
    private String clientNotes;
    private LocalDateTime createdAt;

    public RecentBookingDTO() {}

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRenterFirstName() { return renterFirstName; }
    public void setRenterFirstName(String renterFirstName) { this.renterFirstName = renterFirstName; }

    public String getRenterLastName() { return renterLastName; }
    public void setRenterLastName(String renterLastName) { this.renterLastName = renterLastName; }

    public String getRenterEmail() { return renterEmail; }
    public void setRenterEmail(String renterEmail) { this.renterEmail = renterEmail; }

    public boolean isRenterIsDriver() { return renterIsDriver; }
    public void setRenterIsDriver(boolean renterIsDriver) { this.renterIsDriver = renterIsDriver; }

    public String getVehicleBrand() { return vehicleBrand; }
    public void setVehicleBrand(String vehicleBrand) { this.vehicleBrand = vehicleBrand; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getVehicleLicensePlate() { return vehicleLicensePlate; }
    public void setVehicleLicensePlate(String vehicleLicensePlate) { this.vehicleLicensePlate = vehicleLicensePlate; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public Double getInitialPrice() { return initialPrice; }
    public void setInitialPrice(Double initialPrice) { this.initialPrice = initialPrice; }

    public Double getProposedPrice() { return proposedPrice; }
    public void setProposedPrice(Double proposedPrice) { this.proposedPrice = proposedPrice; }

    public Double getDriverDiscount() { return driverDiscount; }
    public void setDriverDiscount(Double driverDiscount) { this.driverDiscount = driverDiscount; }

    public Double getFinalPrice() { return finalPrice; }
    public void setFinalPrice(Double finalPrice) { this.finalPrice = finalPrice; }

    public boolean isPriceNegotiated() { return priceNegotiated; }
    public void setPriceNegotiated(boolean priceNegotiated) { this.priceNegotiated = priceNegotiated; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getClientNotes() { return clientNotes; }
    public void setClientNotes(String clientNotes) { this.clientNotes = clientNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
