package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.PassengerBookingResponseDTO;
import com.pfeproject.GoRide.entities.RentalStatus;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/client")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ClientController {

    @Autowired
    private com.pfeproject.GoRide.repositories.BookingRepository bookingRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.RentalContractRepository rentalContractRepository;

    @Autowired
    private com.pfeproject.GoRide.services.ReviewService reviewService;

    @Autowired
    private com.pfeproject.GoRide.services.MessagingService messagingService;

    @Autowired
    private com.pfeproject.GoRide.services.NotificationService notificationService;

    @Autowired
    private com.pfeproject.GoRide.services.RideRequestService rideRequestService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private com.pfeproject.GoRide.repositories.RideRequestRepository rideRequestRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.ConversationRepository conversationRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.MessageRepository messageRepository;

    /**
     * GET /api/client/shared-bookings
     * Réservations covoiturage du passager (réponse plate, fiable pour le frontend).
     */
    @GetMapping("/shared-bookings")
    public ResponseEntity<List<PassengerBookingResponseDTO>> getSharedBookings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getBookingsByUser(userDetails.getId()));
    }

    @GetMapping("/sidebar-counts")
    public ResponseEntity<?> getClientSidebarCounts(
            @RequestParam(value = "mode", required = false) String mode,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        java.util.Map<String, Long> counts = new java.util.HashMap<>();
        String modeKey = "TENANT".equalsIgnoreCase(mode) ? "TENANT" : "PASSENGER";

        // 1. Notifications non lues (même filtre que la page notifications)
        counts.put("notifications", notificationService.getUnreadCountForMode(userId, modeKey));

        // 2. Avis en attente
        counts.put("pendingReviews", (long) reviewService.getPendingReviews(userId).size());

        // 3. Messages non lus (locataire = RENTAL ; passager = hors location)
        if ("TENANT".equalsIgnoreCase(mode)) {
            counts.put("conversations", messagingService.countUnreadMessagesForUser(userId, "RENTAL"));
        } else {
            counts.put("conversations", messagingService.countUnreadMessagesForUserExcluding(userId, "RENTAL"));
        }

        if ("TENANT".equalsIgnoreCase(mode)) {
            long pendingRentals = rentalContractRepository.countByRenterIdAndStatus(userId, RentalStatus.PENDING);
            counts.put("reservations", pendingRentals);
            counts.put("trips", pendingRentals);
        } else {
            long activeBookings = bookingRepository.findActiveByPassengerId(userId).size();
            counts.put("trips", activeBookings);
            counts.put("reservations", 0L);

            long currentRideCount = rideRequestService.getCurrentClientRide(userId) != null ? 1L : 0L;
            counts.put("currentRide", currentRideCount);
        }

        return ResponseEntity.ok(counts);
    }

    @GetMapping("/search")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> searchClientData(
            @RequestParam("q") String query,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();
        String q = query != null ? query.toLowerCase().trim() : "";

        List<Map<String, Object>> trips = rideRequestRepository.findByClientIdOrderByCreatedAtDesc(userId).stream()
                .filter(r -> q.isEmpty()
                        || (r.getDeparture() != null && r.getDeparture().toLowerCase().contains(q))
                        || (r.getDestination() != null && r.getDestination().toLowerCase().contains(q))
                        || (r.getDriver() != null && (
                                nameContains(r.getDriver().getFirstName(), q)
                                        || nameContains(r.getDriver().getLastName(), q)))
                        || String.valueOf(r.getId()).contains(q))
                .limit(8)
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("label", (r.getDeparture() != null ? r.getDeparture() : "?") + " → "
                            + (r.getDestination() != null ? r.getDestination() : "?"));
                    m.put("meta", (r.getDriver() != null
                            ? r.getDriver().getFirstName() + " " + r.getDriver().getLastName()
                            : "Chauffeur") + " • " + r.getStatus());
                    m.put("status", r.getStatus());
                    return m;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> rentals = rentalContractRepository.findByRenterIdWithDetails(userId).stream()
                .filter(b -> q.isEmpty()
                        || String.valueOf(b.getId()).contains(q)
                        || (b.getVehicle() != null && (
                                contains(b.getVehicle().getBrand(), q) || contains(b.getVehicle().getModel(), q)))
                        || (b.getOwner() != null && (
                                nameContains(b.getOwner().getFirstName(), q)
                                        || nameContains(b.getOwner().getLastName(), q))))
                .limit(8)
                .map(b -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", b.getId());
                    m.put("label", b.getVehicle() != null
                            ? b.getVehicle().getBrand() + " " + b.getVehicle().getModel()
                            : "Location #" + b.getId());
                    m.put("meta", (b.getOwner() != null
                            ? b.getOwner().getFirstName() + " " + b.getOwner().getLastName()
                            : "Propriétaire") + " • " + b.getStatus());
                    m.put("status", b.getStatus() != null ? b.getStatus().name() : "");
                    return m;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> conversations = conversationRepository.findAllByUserId(userId).stream()
                .filter(c -> q.isEmpty() || conversationMatches(c, userId, q))
                .limit(8)
                .map(c -> {
                    var other = c.getOwner().getId().equals(userId) ? c.getClient() : c.getOwner();
                    var last = messageRepository.findFirstByConversationIdOrderByTimestampDesc(c.getId());
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", c.getId());
                    m.put("label", other.getFirstName() + " " + other.getLastName());
                    m.put("meta", last != null ? last.getContent() : "Conversation");
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> results = new HashMap<>();
        results.put("trips", trips);
        results.put("rentals", rentals);
        results.put("conversations", conversations);
        return ResponseEntity.ok(results);
    }

    private static boolean contains(String value, String q) {
        return value != null && value.toLowerCase().contains(q);
    }

    private static boolean nameContains(String value, String q) {
        return contains(value, q);
    }

    private static boolean conversationMatches(
            com.pfeproject.GoRide.entities.Conversation c, Long userId, String q) {
        var other = c.getOwner().getId().equals(userId) ? c.getClient() : c.getOwner();
        return nameContains(other.getFirstName(), q)
                || nameContains(other.getLastName(), q)
                || (c.getVehicle() != null && (
                        contains(c.getVehicle().getBrand(), q) || contains(c.getVehicle().getModel(), q)));
    }
}
