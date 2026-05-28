package com.pfeproject.GoRide.dto;

import com.pfeproject.GoRide.entities.RentalStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class RentalContractDTO {
    
    @NotNull(message = "L'ID du véhicule est obligatoire")
    private Long vehicleId;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDate endDate;

    private String pickupLocation;
    
    private String returnLocation;

    private Double proposedPrice;
    
    private String clientNotes;
    
    private String message;

    public RentalContractDTO() {}

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

    public String getReturnLocation() { return returnLocation; }
    public void setReturnLocation(String returnLocation) { this.returnLocation = returnLocation; }

    public Double getProposedPrice() { return proposedPrice; }
    public void setProposedPrice(Double proposedPrice) { this.proposedPrice = proposedPrice; }

    public String getClientNotes() { return clientNotes; }
    public void setClientNotes(String clientNotes) { this.clientNotes = clientNotes; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
