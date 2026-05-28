package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.services.AppLinkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Direct in-app links — no email or API key required.
 */
@RestController
@RequestMapping("/api/public")
public class PublicLinksController {

    @Autowired
    private AppLinkService appLinkService;

    @Value("${goride.mail.enabled:false}")
    private boolean mailEnabled;

    @GetMapping("/links")
    public ResponseEntity<Map<String, Object>> links() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("baseUrl", appLinkService.base());
        body.put("emailEnabled", mailEnabled);
        body.put("note", "Confirmations happen in the app (notifications + these URLs). Email is optional.");

        Map<String, String> client = new LinkedHashMap<>();
        client.put("login", appLinkService.login());
        client.put("exploreVehicles", appLinkService.clientExplore());
        client.put("myReservations", appLinkService.clientReservations());
        client.put("bookCarpoolSeat", appLinkService.clientAvailableRides());
        client.put("requestDriver", appLinkService.clientRequestRide());
        client.put("currentRide", appLinkService.clientCurrentRide());
        client.put("conversations", appLinkService.clientConversations());
        client.put("notifications", appLinkService.clientNotifications());
        body.put("client", client);

        Map<String, String> driver = new LinkedHashMap<>();
        driver.put("rideRequests", appLinkService.driverRequests());
        driver.put("myTrips", appLinkService.driverTrips());
        driver.put("conversations", appLinkService.driverConversations());
        body.put("driver", driver);

        Map<String, String> fleet = new LinkedHashMap<>();
        fleet.put("rentalRequests", appLinkService.fleetBookings());
        body.put("fleet", fleet);

        Map<String, String> externalKeys = new LinkedHashMap<>();
        externalKeys.put("resendApiKey", "https://resend.com/api-keys");
        externalKeys.put("geminiApiKey", "https://aistudio.google.com/apikey");
        externalKeys.put("gmailAppPassword", "https://myaccount.google.com/apppasswords");
        externalKeys.put("documentation", "See DIRECT-LINKS.md and API-KEYS.md in project root");
        body.put("optionalExternalKeys", externalKeys);

        return ResponseEntity.ok(body);
    }
}
