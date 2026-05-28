package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.RecentBookingDTO;
import com.pfeproject.GoRide.dto.ReviewDTO;
import com.pfeproject.GoRide.dto.VehicleDTO;
import com.pfeproject.GoRide.entities.RentalContract;
import com.pfeproject.GoRide.entities.RentalStatus;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.entities.Activity;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.VehicleService;
import com.pfeproject.GoRide.services.ReviewService;
import com.pfeproject.GoRide.services.MessagingService;
import com.pfeproject.GoRide.services.NotificationService;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import com.pfeproject.GoRide.repositories.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/fleet")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FleetController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private RentalContractRepository rentalContractRepository;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.ConversationRepository conversationRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.ReviewRepository reviewRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.NotificationRepository notificationRepository;

    @GetMapping("/sidebar-counts")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> getFleetSidebarCounts(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        long bookings = rentalContractRepository.countByOwnerIdAndStatus(userId, RentalStatus.PENDING);
        long messages = messagingService.countUnreadMessagesForUser(userId, null);
        long notifications = notificationService.getUnreadCount(userId);
        long reviews = reviewService.getOwnerReviews(userId).size();
        long payments = rentalContractRepository.countByOwnerIdAndStatus(userId, RentalStatus.COMPLETED);
        long vehicles = vehicleRepository.countByOwnerId(userId);

        Map<String, Long> counts = new HashMap<>();
        counts.put("bookings", bookings);
        counts.put("messages", messages);
        counts.put("notifications", notifications);
        counts.put("reviews", reviews);
        counts.put("payments", payments);
        counts.put("vehicles", vehicles);

        return ResponseEntity.ok(counts);
    }

    @GetMapping("/bookings/received")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<RentalContract>> getReceivedBookings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(rentalContractRepository.findByOwnerIdOrderByCreatedAtDesc(userDetails.getId()));
    }

    @GetMapping("/messages")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> getFleetMessages(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(messagingService.getUserConversations(userDetails.getId()));
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> getFleetNotifications(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(notificationService.getNotificationsByUser(userDetails.getId()));
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> getFleetHistory(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Activity> activities = activityRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getId());
        List<Activity> fleetActivities = activities.stream()
                .filter(a -> "FLEET".equals(a.getType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(fleetActivities);
    }

    @GetMapping("/earnings")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getFleetEarnings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<RentalContract> contracts = rentalContractRepository.findByOwnerIdWithDetailsForList(userId);

        long totalTransactions = contracts.stream().filter(c -> c.getStatus() == RentalStatus.COMPLETED).count();
        double totalEarnings = contracts.stream()
                .filter(c -> c.getStatus() == RentalStatus.COMPLETED)
                .mapToDouble(this::contractAmount)
                .sum();
        double pendingEarnings = contracts.stream()
                .filter(c -> c.getStatus() == RentalStatus.ACCEPTED || c.getStatus() == RentalStatus.PENDING)
                .mapToDouble(this::contractAmount)
                .sum();
        double averageRevenue = totalTransactions > 0 ? totalEarnings / totalTransactions : 0.0;

        List<Map<String, Object>> contractDtos = contracts.stream()
                .map(this::toEarningsContractDto)
                .collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTransactions", totalTransactions);
        stats.put("totalEarnings", totalEarnings);
        stats.put("pendingEarnings", pendingEarnings);
        stats.put("averageRevenue", averageRevenue);
        stats.put("contracts", contractDtos);

        return ResponseEntity.ok(stats);
    }

    private Map<String, Object> toEarningsContractDto(RentalContract c) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", c.getId());
        dto.put("status", c.getStatus() != null ? c.getStatus().name() : "PENDING");
        dto.put("startDate", c.getStartDate());
        dto.put("endDate", c.getEndDate());
        dto.put("createdAt", c.getCreatedAt());
        dto.put("finalPrice", c.getFinalPrice());
        dto.put("proposedPrice", c.getProposedPrice());
        dto.put("totalPrice", c.getTotalPrice());
        dto.put("paymentStatus", c.getPaymentStatus());
        dto.put("paymentMethod", paymentMethodLabel(c));
        dto.put("pickupLocation", c.getPickupLocation());
        dto.put("returnLocation", c.getReturnLocation());

        if (c.getVehicle() != null) {
            Map<String, Object> vehicle = new HashMap<>();
            vehicle.put("id", c.getVehicle().getId());
            vehicle.put("brand", c.getVehicle().getBrand());
            vehicle.put("model", c.getVehicle().getModel());
            vehicle.put("dailyPrice", c.getVehicle().getDailyPrice());
            vehicle.put("photoUrl", c.getVehicle().getPhotoUrl());
            dto.put("vehicle", vehicle);
        }
        if (c.getRenter() != null) {
            Map<String, Object> renter = new HashMap<>();
            renter.put("firstName", c.getRenter().getFirstName());
            renter.put("lastName", c.getRenter().getLastName());
            renter.put("email", c.getRenter().getEmail());
            renter.put("phone", c.getRenter().getPhone());
            dto.put("renter", renter);
        }
        return dto;
    }

    private static String paymentMethodLabel(RentalContract c) {
        if ("PAID".equalsIgnoreCase(c.getPaymentStatus())) {
            return "Carte bancaire";
        }
        if (c.getPaymentStatus() != null && c.getPaymentStatus().toUpperCase().contains("D17")) {
            return "D17";
        }
        return "Espèces";
    }

    /** Montant affiché : finalPrice, sinon proposedPrice / totalPrice (demandes en attente). */
    private double contractAmount(RentalContract c) {
        if (c.getFinalPrice() != null) {
            return c.getFinalPrice();
        }
        if (c.getProposedPrice() != null) {
            return c.getProposedPrice();
        }
        return c.getTotalPrice() != null ? c.getTotalPrice() : 0.0;
    }

    @GetMapping("/payments")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> getFleetPayments(Authentication authentication) {
        return getFleetEarnings(authentication);
    }

    @GetMapping("/reviews")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<ReviewDTO>> getFleetReviews(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(reviewService.getOwnerReviews(userDetails.getId()));
    }

    @GetMapping("/vehicles/me")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<VehicleDTO>> getMyFleet(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(vehicleService.getFleetByOwner(userDetails.getId()));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> searchFleetData(
            @RequestParam("q") String query,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        String q = query != null ? query.toLowerCase().trim() : "";

        List<Vehicle> vehicles = vehicleRepository.findByOwnerId(userId);
        List<RentalContract> bookings = rentalContractRepository.findByOwnerIdWithDetails(userId);
        List<com.pfeproject.GoRide.entities.Conversation> conversations = conversationRepository.findAllByUserId(userId);
        List<com.pfeproject.GoRide.entities.Review> reviews = reviewRepository.findByOwnerId(userId);
        List<com.pfeproject.GoRide.entities.Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // Filter vehicles
        List<Map<String, Object>> filteredVehicles = vehicles.stream()
                .filter(v -> q.isEmpty() || 
                        (v.getBrand() != null && v.getBrand().toLowerCase().contains(q)) || 
                        (v.getModel() != null && v.getModel().toLowerCase().contains(q)) ||
                        (v.getLicensePlate() != null && v.getLicensePlate().toLowerCase().contains(q)))
                .map(v -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", v.getId());
                    map.put("name", v.getBrand() + " " + v.getModel());
                    map.put("category", v.getCategory());
                    map.put("plateNumber", v.getLicensePlate());
                    return map;
                }).collect(Collectors.toList());

        // Filter bookings
        List<Map<String, Object>> filteredBookings = bookings.stream()
                .filter(b -> q.isEmpty() ||
                        b.getId().toString().contains(q) ||
                        (b.getRenter() != null && (
                                (b.getRenter().getFirstName() != null && b.getRenter().getFirstName().toLowerCase().contains(q)) ||
                                (b.getRenter().getLastName() != null && b.getRenter().getLastName().toLowerCase().contains(q))
                        )) ||
                        (b.getVehicle() != null && (
                                (b.getVehicle().getBrand() != null && b.getVehicle().getBrand().toLowerCase().contains(q)) ||
                                (b.getVehicle().getModel() != null && b.getVehicle().getModel().toLowerCase().contains(q))
                        )))
                .map(b -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", b.getId());
                    map.put("contractNumber", "RC-" + b.getId());
                    map.put("clientName", b.getRenter() != null ? b.getRenter().getFirstName() + " " + b.getRenter().getLastName() : "Client inconnu");
                    map.put("vehicleName", b.getVehicle() != null ? b.getVehicle().getBrand() + " " + b.getVehicle().getModel() : "Véhicule inconnu");
                    map.put("status", b.getStatus());
                    map.put("price", b.getFinalPrice());
                    return map;
                }).collect(Collectors.toList());

        // Filter distinct users (locataires, chauffeurs) from bookings
        List<Map<String, Object>> filteredUsers = bookings.stream()
                .map(RentalContract::getRenter)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .filter(u -> q.isEmpty() ||
                        (u.getFirstName() != null && u.getFirstName().toLowerCase().contains(q)) ||
                        (u.getLastName() != null && u.getLastName().toLowerCase().contains(q)) ||
                        (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                        (u.getPhone() != null && u.getPhone().toLowerCase().contains(q)))
                .map(u -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", u.getId());
                    map.put("name", u.getFirstName() + " " + u.getLastName());
                    map.put("email", u.getEmail());
                    map.put("phone", u.getPhone());
                    map.put("role", "ROLE_CLIENT");
                    return map;
                }).collect(Collectors.toList());

        // Filter conversations (other participant + vehicle)
        List<Map<String, Object>> filteredConversations = conversations.stream()
                .filter(c -> {
                    if (q.isEmpty()) return true;
                    com.pfeproject.GoRide.entities.UserEntity other =
                            c.getOwner().getId().equals(userId) ? c.getClient() : c.getOwner();
                    return (other.getFirstName() != null && other.getFirstName().toLowerCase().contains(q))
                            || (other.getLastName() != null && other.getLastName().toLowerCase().contains(q))
                            || (c.getVehicle() != null && (
                                    (c.getVehicle().getBrand() != null && c.getVehicle().getBrand().toLowerCase().contains(q))
                                            || (c.getVehicle().getModel() != null && c.getVehicle().getModel().toLowerCase().contains(q))));
                })
                .map(c -> {
                    com.pfeproject.GoRide.entities.UserEntity other =
                            c.getOwner().getId().equals(userId) ? c.getClient() : c.getOwner();
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("participantName", other.getFirstName() + " " + other.getLastName());
                    map.put("context", c.getContext());
                    map.put("vehicleName", c.getVehicle() != null ? c.getVehicle().getBrand() + " " + c.getVehicle().getModel() : null);
                    return map;
                }).collect(Collectors.toList());

        // Filter payments
        List<Map<String, Object>> filteredPayments = bookings.stream()
                .filter(b -> b.getStatus() == RentalStatus.COMPLETED)
                .filter(b -> q.isEmpty() ||
                        b.getId().toString().contains(q) ||
                        (b.getRenter() != null && (
                                (b.getRenter().getFirstName() != null && b.getRenter().getFirstName().toLowerCase().contains(q)) ||
                                (b.getRenter().getLastName() != null && b.getRenter().getLastName().toLowerCase().contains(q))
                        )))
                .map(b -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", b.getId());
                    map.put("contractNumber", "RC-" + b.getId());
                    map.put("amount", b.getFinalPrice());
                    map.put("clientName", b.getRenter() != null ? b.getRenter().getFirstName() + " " + b.getRenter().getLastName() : "Client");
                    return map;
                }).collect(Collectors.toList());

        // Filter reviews
        List<Map<String, Object>> filteredReviews = reviews.stream()
                .filter(r -> q.isEmpty() ||
                        (r.getComment() != null && r.getComment().toLowerCase().contains(q)) ||
                        (r.getClient() != null && (
                                (r.getClient().getFirstName() != null && r.getClient().getFirstName().toLowerCase().contains(q)) ||
                                (r.getClient().getLastName() != null && r.getClient().getLastName().toLowerCase().contains(q))
                        )))
                .map(r -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", r.getId());
                    map.put("comment", r.getComment());
                    map.put("rating", r.getVehicleRating() != null ? r.getVehicleRating() : r.getOwnerRating());
                    map.put("clientName", r.getClient() != null ? r.getClient().getFirstName() + " " + r.getClient().getLastName() : "Client");
                    return map;
                }).collect(Collectors.toList());

        // Filter notifications
        List<Map<String, Object>> filteredNotifications = notifications.stream()
                .filter(n -> q.isEmpty() ||
                        (n.getTitle() != null && n.getTitle().toLowerCase().contains(q)) ||
                        (n.getMessage() != null && n.getMessage().toLowerCase().contains(q)))
                .map(n -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", n.getId());
                    map.put("title", n.getTitle());
                    map.put("message", n.getMessage());
                    map.put("createdAt", n.getCreatedAt());
                    return map;
                }).collect(Collectors.toList());

        Map<String, Object> results = new HashMap<>();
        results.put("vehicles", filteredVehicles);
        results.put("bookings", filteredBookings);
        results.put("users", filteredUsers);
        results.put("conversations", filteredConversations);
        results.put("payments", filteredPayments);
        results.put("reviews", filteredReviews);
        results.put("notifications", filteredNotifications);

        return ResponseEntity.ok(results);
    }
}
