package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.*;
import com.pfeproject.GoRide.entities.VehicleStatus;

/**
 * DTO pour l'ajout ou la mise à jour d'un véhicule de flotte.
 */
public class VehicleDTO {

    private Long id;

    @NotBlank(message = "La marque est obligatoire")
    private String brand;

    @NotBlank(message = "Le modèle est obligatoire")
    private String model;

    @NotBlank(message = "La plaque d'immatriculation est obligatoire")
    private String licensePlate;

    @Min(value = 1, message = "Le nombre de places doit être au moins 1")
    private Integer seats = 4;

    private Boolean hasWifi = false;
    private Boolean hasBabySeat = false;
    private Boolean hasAC = true;
    private Integer luggageCapacity = 2;
    
    @NotBlank(message = "Le type de carburant est obligatoire")
    private String fuelType;
    
    @NotBlank(message = "La couleur est obligatoire")
    private String color;
    
    @NotNull(message = "L'année est obligatoire")
    @Min(value = 1900, message = "Année invalide")
    private Integer year;
    
    @NotBlank(message = "La catégorie est obligatoire")
    private String category; // STANDARD, LUXE, etc.
    
    private Long driverId; // optionnel : assigner un chauffeur
    
    // Nouveaux champs pour la location
    @NotBlank(message = "La transmission est obligatoire")
    private String transmission;
    
    @NotBlank(message = "La localisation est obligatoire")
    private String location;
    
    @NotNull(message = "Le prix journalier est obligatoire")
    @Positive(message = "Le prix doit être positif")
    private Double dailyPrice;
    
    /** URL publique ou chemin /vehicle-photos/... après upload */
    private String photoUrl;
    
    private String imageUrl;
    
    private String description;
    
    @NotNull(message = "Le kilométrage est obligatoire")
    @Min(value = 0, message = "Le kilométrage ne peut pas être négatif")
    private Integer mileage;
    
    @NotBlank(message = "L'assurance est obligatoire")
    private String insuranceInfo;
    
    @NotNull(message = "La caution est obligatoire")
    @Min(value = 0, message = "La caution ne peut pas être négative")
    private Double depositAmount;
    
    @NotBlank(message = "La consommation est obligatoire")
    private String consumption;
    
    private VehicleStatus status;

    private Boolean available = true;

    // Stats fields
    private Long bookingCount = 0L;
    private Double totalRevenue = 0.0;
    private Double rating = 0.0;
    private Integer viewCount = 0;

    public VehicleDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }

    public Integer getSeats() { return seats; }
    public void setSeats(Integer seats) { this.seats = seats; }

    public Boolean getHasWifi() { return hasWifi; }
    public void setHasWifi(Boolean hasWifi) { this.hasWifi = hasWifi; }

    public Boolean getHasBabySeat() { return hasBabySeat; }
    public void setHasBabySeat(Boolean hasBabySeat) { this.hasBabySeat = hasBabySeat; }

    public Integer getLuggageCapacity() { return luggageCapacity; }
    public void setLuggageCapacity(Integer luggageCapacity) { this.luggageCapacity = luggageCapacity; }

    public String getFuelType() { return fuelType; }
    public void setFuelType(String fuelType) { this.fuelType = fuelType; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }

    public String getTransmission() { return transmission; }
    public void setTransmission(String transmission) { this.transmission = transmission; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getDailyPrice() { return dailyPrice; }
    public void setDailyPrice(Double dailyPrice) { this.dailyPrice = dailyPrice; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { 
        this.photoUrl = photoUrl; 
        this.imageUrl = photoUrl;
    }

    public String getImageUrl() { 
        return photoUrl != null ? photoUrl : imageUrl; 
    }
    public void setImageUrl(String imageUrl) { 
        this.imageUrl = imageUrl; 
        this.photoUrl = imageUrl;
    }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public VehicleStatus getStatus() { return status; }
    public void setStatus(VehicleStatus status) { this.status = status; }

    public Boolean getHasAC() { return hasAC; }
    public void setHasAC(Boolean hasAC) { this.hasAC = hasAC; }

    public Integer getMileage() { return mileage; }
    public void setMileage(Integer mileage) { this.mileage = mileage; }

    public String getInsuranceInfo() { return insuranceInfo; }
    public void setInsuranceInfo(String insuranceInfo) { this.insuranceInfo = insuranceInfo; }

    public Double getDepositAmount() { return depositAmount; }
    public void setDepositAmount(Double depositAmount) { this.depositAmount = depositAmount; }

    public String getConsumption() { return consumption; }
    public void setConsumption(String consumption) { this.consumption = consumption; }

    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }

    public Long getBookingCount() { return bookingCount; }
    public void setBookingCount(Long bookingCount) { this.bookingCount = bookingCount; }

    public Double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(Double totalRevenue) { this.totalRevenue = totalRevenue; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
}
