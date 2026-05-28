package com.pfeproject.GoRide.util;

import com.pfeproject.GoRide.entities.RentalContract;
import com.pfeproject.GoRide.entities.Vehicle;

import java.util.HashMap;
import java.util.Map;

/**
 * Maps RentalContract entities to JSON-friendly maps for the Angular frontend.
 */
public final class RentalMapper {

    private RentalMapper() {}

    public static Map<String, Object> toMap(RentalContract c) {
        Map<String, Object> map = new HashMap<>();
        if (c == null) return map;

        map.put("id", c.getId());
        map.put("startDate", c.getStartDate());
        map.put("endDate", c.getEndDate());
        map.put("proposedPrice", c.getProposedPrice());
        map.put("totalPrice", c.getTotalPrice());
        map.put("finalPrice", c.getFinalPrice());
        map.put("pickupLocation", c.getPickupLocation());
        map.put("returnLocation", c.getReturnLocation());
        map.put("status", c.getStatus() != null ? c.getStatus().name() : "PENDING");
        map.put("paymentStatus", c.getPaymentStatus());
        map.put("createdAt", c.getCreatedAt());
        map.put("clientNotes", c.getClientNotes());

        if (c.getVehicle() != null) {
            Vehicle v = c.getVehicle();
            map.put("vehicleId", v.getId());
            map.put("vehicleName", v.getBrand() + " " + v.getModel());

            Map<String, Object> vehicle = new HashMap<>();
            vehicle.put("id", v.getId());
            vehicle.put("brand", v.getBrand());
            vehicle.put("model", v.getModel());
            vehicle.put("category", v.getCategory());
            vehicle.put("location", v.getLocation());
            vehicle.put("dailyPrice", v.getDailyPrice());
            vehicle.put("depositAmount", v.getDepositAmount());
            vehicle.put("photoUrl", v.getPhotoUrl());
            vehicle.put("imageUrl", v.getPhotoUrl());
            vehicle.put("licensePlate", v.getLicensePlate());
            map.put("vehicle", vehicle);
        }

        if (c.getOwner() != null) {
            map.put("ownerId", c.getOwner().getId());
            map.put("ownerName", safeName(c.getOwner().getFirstName(), c.getOwner().getLastName()));

            Map<String, Object> owner = new HashMap<>();
            owner.put("id", c.getOwner().getId());
            owner.put("firstName", c.getOwner().getFirstName());
            owner.put("lastName", c.getOwner().getLastName());
            owner.put("email", c.getOwner().getEmail());
            map.put("owner", owner);
        }

        if (c.getRenter() != null) {
            map.put("renterId", c.getRenter().getId());
            map.put("renterName", safeName(c.getRenter().getFirstName(), c.getRenter().getLastName()));

            Map<String, Object> renter = new HashMap<>();
            renter.put("id", c.getRenter().getId());
            renter.put("firstName", c.getRenter().getFirstName());
            renter.put("lastName", c.getRenter().getLastName());
            renter.put("email", c.getRenter().getEmail());
            map.put("renter", renter);
        }

        return map;
    }

    private static String safeName(String first, String last) {
        String name = ((first != null ? first : "") + " " + (last != null ? last : "")).trim();
        return name.isEmpty() ? "Utilisateur" : name;
    }
}
