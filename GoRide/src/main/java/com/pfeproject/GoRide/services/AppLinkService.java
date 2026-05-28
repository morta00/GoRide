package com.pfeproject.GoRide.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Builds direct in-app URLs (no email required). Base URL = Angular app (port 4200).
 */
@Service
public class AppLinkService {

    @Value("${app.base-url:http://localhost:4200}")
    private String baseUrl;

    public String base() {
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public String login() { return base() + "/login"; }

    public String clientReservations() { return base() + "/client/reservations"; }

    public String clientReservation(Long id) { return base() + "/client/reservations/" + id; }

    public String clientExplore() { return base() + "/client/explore"; }

    public String clientAvailableRides() { return base() + "/client/available-rides"; }

    public String clientRequestRide() { return base() + "/client/request-ride"; }

    public String clientCurrentRide() { return base() + "/client/current-ride"; }

    public String clientConversations() { return base() + "/client/conversations"; }

    public String clientNotifications() { return base() + "/client/notifications"; }

    public String driverRequests() { return base() + "/driver/requests"; }

    public String driverTrips() { return base() + "/driver/trips"; }

    public String driverConversations() { return base() + "/driver/conversations"; }

    public String fleetBookings() { return base() + "/fleet/bookings"; }

    public String passwordReset(String token) { return base() + "/reset-password?token=" + token; }
}
