package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.RentalContractDTO;
import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.*;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.RentalService;
import com.pfeproject.GoRide.services.VehicleService;
import com.pfeproject.GoRide.util.RentalMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/company")
@PreAuthorize("hasRole('COMPANY')")
public class CompanyController {

    private static final Logger log = LoggerFactory.getLogger(CompanyController.class);

    @Autowired
    private CompanyServiceRequestRepository companyServiceRequestRepository;

    @Autowired
    private CompanySettingsRepository companySettingsRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserDocumentRepository userDocumentRepository;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private RentalService rentalService;

    @Autowired
    private RentalContractRepository rentalContractRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<CompanyServiceRequest> requests = companyServiceRequestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);

        long pendingRequests = requests.stream()
                .filter(r -> r.getStatus() != null && r.getStatus().contains("PENDING"))
                .count();

        long acceptedServices = requests.stream()
                .filter(r -> r.getStatus() != null && r.getStatus().contains("ACCEPTED"))
                .count();

        long activeMissions = requests.stream()
                .filter(r -> "IN_PROGRESS".equalsIgnoreCase(r.getStatus()))
                .count();

        long reservedVehicles = requests.stream()
                .filter(r -> ("CONFIRMED".equalsIgnoreCase(r.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(r.getStatus()))
                        && "VEHICLE_RENTAL".equalsIgnoreCase(r.getType()))
                .count();

        long reservedDrivers = requests.stream()
                .filter(r -> ("CONFIRMED".equalsIgnoreCase(r.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(r.getStatus()))
                        && "DRIVER_WITH_CAR".equalsIgnoreCase(r.getType()))
                .count();

        // All company transactions/payments
        List<Transaction> transactions = transactionRepository.findAll().stream()
                .filter(t -> t.getUser() != null && t.getUser().getId().equals(companyId))
                .collect(Collectors.toList());

        long unpaidInvoices = transactions.stream()
                .filter(t -> "PENDING".equalsIgnoreCase(t.getStatus()))
                .count();

        List<Notification> notifications = notificationRepository.findAll().stream()
                .filter(n -> n.getUser() != null && n.getUser().getId().equals(companyId))
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("pendingRequests", pendingRequests);
        response.put("acceptedServices", acceptedServices);
        response.put("activeMissions", activeMissions);
        response.put("reservedVehicles", reservedVehicles);
        response.put("reservedDrivers", reservedDrivers);
        response.put("unpaidInvoices", unpaidInvoices);
        response.put("recentRequests", requests.stream().limit(5).collect(Collectors.toList()));
        response.put("activeMissionsList", requests.stream().filter(r -> "IN_PROGRESS".equalsIgnoreCase(r.getStatus())).limit(5).collect(Collectors.toList()));
        response.put("confirmedReservations", requests.stream().filter(r -> "CONFIRMED".equalsIgnoreCase(r.getStatus())).limit(5).collect(Collectors.toList()));
        response.put("recentPayments", transactions.stream().limit(5).collect(Collectors.toList()));
        response.put("pendingReviews", new ArrayList<>());
        response.put("notifications", notifications.stream().limit(5).collect(Collectors.toList()));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getRequests(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();
        List<Map<String, Object>> combined = new ArrayList<>();

        for (CompanyServiceRequest r : companyServiceRequestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("type", r.getType());
            m.put("status", r.getStatus());
            m.put("targetRole", r.getTargetRole());
            m.put("vehicleId", r.getVehicleId());
            m.put("vehicleName", r.getVehicleName());
            m.put("ownerName", r.getOwnerName());
            if (r.getVehicleId() != null) {
                vehicleRepository.findById(r.getVehicleId()).ifPresent(v -> {
                    if (v.getOwner() != null) {
                        m.put("ownerId", v.getOwner().getId());
                    }
                });
            }
            m.put("driverId", r.getDriverId());
            m.put("driverName", r.getDriverName());
            m.put("startDate", r.getStartDate());
            m.put("endDate", r.getEndDate());
            m.put("city", r.getCity());
            m.put("budget", r.getBudget());
            m.put("pricePerDay", r.getPricePerDay());
            m.put("comment", r.getComment());
            m.put("description", r.getDescription());
            m.put("needType", r.getNeedType());
            m.put("missionType", r.getMissionType());
            m.put("createdAt", r.getCreatedAt());
            m.put("source", "SERVICE_REQUEST");
            combined.add(m);
        }

        for (RentalContract c : rentalContractRepository.findByRenterIdWithDetails(companyId)) {
            Map<String, Object> m = RentalMapper.toMap(c);
            m.put("type", "VEHICLE_RENTAL");
            m.put("source", "RENTAL_CONTRACT");
            m.put("vehicleName", c.getVehicle() != null
                    ? c.getVehicle().getBrand() + " " + c.getVehicle().getModel() : null);
            if (c.getOwner() != null) {
                m.put("ownerName", c.getOwner().getFirstName() + " " + c.getOwner().getLastName());
            }
            Double rentalPrice = c.getFinalPrice() != null ? c.getFinalPrice()
                    : (c.getTotalPrice() != null ? c.getTotalPrice() : c.getProposedPrice());
            m.put("budget", rentalPrice);
            m.put("pricePerDay", c.getProposedPrice());
            combined.add(m);
        }

        combined.sort((a, b) -> {
            Object ca = a.get("createdAt");
            Object cb = b.get("createdAt");
            if (ca == null || cb == null) return 0;
            return cb.toString().compareTo(ca.toString());
        });

        return ResponseEntity.ok(combined);
    }

    @PostMapping("/service-requests")
    public ResponseEntity<?> createRequest(@RequestBody CompanyServiceRequest request, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        request.setCompanyId(companyId);
        request.setCompanyName(userDetails.getFirstName() + " " + userDetails.getLastName());
        request.setCreatedAt(LocalDateTime.now());
        if (request.getStatus() == null) {
            if ("VEHICLE_RENTAL".equalsIgnoreCase(request.getType())) {
                request.setStatus("PENDING_OWNER");
            } else if ("DRIVER_WITH_CAR".equalsIgnoreCase(request.getType())) {
                request.setStatus("PENDING_DRIVER");
            } else {
                request.setStatus("PENDING");
            }
        }

        CompanyServiceRequest saved = companyServiceRequestRepository.save(request);

        if ("VEHICLE_RENTAL".equalsIgnoreCase(saved.getType()) && saved.getVehicleId() != null
                && saved.getStartDate() != null && saved.getEndDate() != null) {
            try {
                RentalContractDTO dto = new RentalContractDTO();
                dto.setVehicleId(saved.getVehicleId());
                dto.setStartDate(saved.getStartDate());
                dto.setEndDate(saved.getEndDate());
                dto.setClientNotes(saved.getComment());
                dto.setPickupLocation(saved.getCity());
                dto.setReturnLocation(saved.getCity());
                if (saved.getBudget() != null && saved.getBudget() > 0) {
                    dto.setProposedPrice(saved.getBudget());
                } else {
                    vehicleRepository.findById(saved.getVehicleId()).ifPresent(v -> {
                        if (v.getDailyPrice() != null) {
                            dto.setProposedPrice(v.getDailyPrice());
                        }
                    });
                }
                rentalService.createReservation(companyId, dto);
            } catch (RuntimeException e) {
                log.warn("Company service request saved but rental contract failed: {}", e.getMessage());
            }
        }

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/service-requests/{id}/cancel")
    public ResponseEntity<?> cancelRequest(@PathVariable Long id, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        Optional<CompanyServiceRequest> opt = companyServiceRequestRepository.findById(id);
        if (opt.isPresent()) {
            CompanyServiceRequest req = opt.get();
            if (req.getCompanyId().equals(companyId)) {
                req.setStatus("CANCELLED");
                companyServiceRequestRepository.save(req);
                return ResponseEntity.ok(req);
            }
        }
        return ResponseEntity.badRequest().body("Request not found or not owned by company");
    }

    @PutMapping("/service-requests/{id}/confirm")
    public ResponseEntity<?> confirmReservation(@PathVariable Long id, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        Optional<CompanyServiceRequest> opt = companyServiceRequestRepository.findById(id);
        if (opt.isPresent()) {
            CompanyServiceRequest req = opt.get();
            if (req.getCompanyId().equals(companyId)) {
                req.setStatus("CONFIRMED");
                companyServiceRequestRepository.save(req);
                return ResponseEntity.ok(req);
            }
        }
        return ResponseEntity.badRequest().body("Request not found or not owned by company");
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<CompanyServiceRequest> requests = companyServiceRequestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
        List<CompanyServiceRequest> history = requests.stream()
                .filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus()) 
                        || "CANCELLED".equalsIgnoreCase(r.getStatus()) 
                        || "REJECTED".equalsIgnoreCase(r.getStatus()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(history);
    }

    @GetMapping("/reviews")
    public ResponseEntity<?> getReviews(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        // Get reviews created by this company (acting as client)
        List<Review> dbReviews = reviewRepository.findAll().stream()
                .filter(r -> r.getClient() != null && r.getClient().getId().equals(companyId))
                .collect(Collectors.toList());

        double totalRating = 0;
        for (Review r : dbReviews) {
            totalRating += r.getVehicleRating() != null ? r.getVehicleRating() : 5.0;
        }
        double averageRating = dbReviews.size() > 0 ? (totalRating / dbReviews.size()) : 0.0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("pending", 0);
        stats.put("sent", dbReviews.size());
        stats.put("averageGiven", averageRating);

        Map<String, Object> response = new HashMap<>();
        response.put("pendingReviews", new ArrayList<>());
        response.put("sentReviews", dbReviews);
        response.put("stats", stats);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<Conversation> list = conversationRepository.findAllByUserId(companyId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<Map<String, Object>> list = notificationRepository.findAll().stream()
                .filter(n -> n.getUser() != null && n.getUser().getId().equals(companyId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toCompanyNotificationDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    private Map<String, Object> toCompanyNotificationDto(Notification n) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", n.getId());
        dto.put("title", n.getTitle());
        dto.put("message", n.getMessage());
        dto.put("text", n.getMessage());
        dto.put("type", n.getType());
        dto.put("targetUrl", n.getTargetUrl());
        dto.put("isRead", Boolean.TRUE.equals(n.getIsRead()));
        dto.put("createdAt", n.getCreatedAt());
        dto.put("relatedEntityType", relatedEntityTypeForNotification(n.getType()));
        dto.put("relatedEntityId", n.getId());
        boolean important = !Boolean.TRUE.equals(n.getIsRead())
                && (n.getType() != null && (
                n.getType().contains("INVOICE") || n.getType().contains("REJECTED")
                        || "SERVICE_REQUEST".equals(n.getType()) || "MESSAGE".equals(n.getType())));
        dto.put("isImportant", important);
        return dto;
    }

    private static String relatedEntityTypeForNotification(String type) {
        if (type == null) {
            return "REQUEST";
        }
        if (type.contains("MESSAGE")) {
            return "CONVERSATION";
        }
        if (type.contains("INVOICE") || type.contains("PAYMENT") || type.contains("REFUND")) {
            return "INVOICE";
        }
        if (type.contains("REVIEW")) {
            return "REVIEW";
        }
        return "REQUEST";
    }

    @GetMapping("/notifications/recent")
    public ResponseEntity<?> getRecentNotifications(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<Map<String, Object>> list = notificationRepository.findAll().stream()
                .filter(n -> n.getUser() != null && n.getUser().getId().equals(companyId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(5)
                .map(this::toCompanyNotificationDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    @GetMapping("/payments")
    public ResponseEntity<?> getPayments(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<Transaction> transactions = transactionRepository.findAll().stream()
                .filter(t -> t.getUser() != null && t.getUser().getId().equals(companyId))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());

        List<Map<String, Object>> txDtos = transactions.stream()
                .map(this::toCompanyPaymentDto)
                .collect(Collectors.toList());

        double totalSpent = transactions.stream()
                .filter(t -> isPaidStatus(t.getStatus()) && !"REFUND".equalsIgnoreCase(t.getType()))
                .mapToDouble(t -> t.getAmount() != null ? t.getAmount() : 0.0)
                .sum();

        long pendingInvoices = transactions.stream()
                .filter(t -> "PENDING".equalsIgnoreCase(t.getStatus()))
                .count();

        long paidInvoices = transactions.stream()
                .filter(t -> isPaidStatus(t.getStatus()))
                .count();

        long refunds = transactions.stream()
                .filter(t -> "REFUNDED".equalsIgnoreCase(t.getStatus()) || "REFUND".equalsIgnoreCase(t.getType()))
                .count();

        List<Map<String, Object>> invoices = txDtos.stream()
                .filter(m -> "PENDING".equalsIgnoreCase(String.valueOf(m.get("status"))))
                .collect(Collectors.toList());

        List<Map<String, Object>> payments = txDtos.stream()
                .filter(m -> isPaidStatus(String.valueOf(m.get("status"))))
                .collect(Collectors.toList());

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalSpent", totalSpent);
        summary.put("pendingInvoices", pendingInvoices);
        summary.put("paidInvoices", paidInvoices);
        summary.put("refunds", refunds);

        Map<String, Object> response = new HashMap<>();
        response.put("summary", summary);
        response.put("transactions", txDtos);
        response.put("invoices", invoices.isEmpty() ? txDtos : invoices);
        response.put("refunds", txDtos.stream()
                .filter(m -> "REFUNDED".equalsIgnoreCase(String.valueOf(m.get("status")))
                        || "REFUND".equalsIgnoreCase(String.valueOf(m.get("type"))))
                .collect(Collectors.toList()));
        response.put("paymentMethods", defaultCompanyPaymentMethods());

        return ResponseEntity.ok(response);
    }

    private static boolean isPaidStatus(String status) {
        return "COMPLETED".equalsIgnoreCase(status) || "PAID".equalsIgnoreCase(status);
    }

    private Map<String, Object> toCompanyPaymentDto(Transaction t) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", t.getId());
        dto.put("transactionId", t.getTransactionId());
        dto.put("title", t.getTitle());
        dto.put("description", t.getTitle());
        dto.put("type", t.getType());
        dto.put("amount", t.getAmount() != null ? t.getAmount() : 0.0);
        String status = t.getStatus();
        if ("COMPLETED".equalsIgnoreCase(status)) {
            status = "PAID";
        }
        dto.put("status", status);
        dto.put("createdAt", t.getCreatedAt());
        return dto;
    }

    private List<Map<String, Object>> defaultCompanyPaymentMethods() {
        List<Map<String, Object>> methods = new ArrayList<>();
        methods.add(Map.of("id", "CARD_COMPANY", "label", "Carte bancaire entreprise", "details", "Visa *** 4455", "active", true));
        methods.add(Map.of("id", "BANK_TRANSFER", "label", "Virement bancaire", "details", "IBAN TN03 2240 0000 0000 0000", "active", true));
        methods.add(Map.of("id", "GOCORP_BALANCE", "label", "Solde GoCorp", "details", "1 250 DT disponibles", "active", true));
        return methods;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        Optional<UserEntity> opt = userRepo.findById(companyId);
        if (opt.isPresent()) {
            return ResponseEntity.ok(opt.get());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/documents")
    public ResponseEntity<?> getDocuments(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<UserDocument> list = userDocumentRepository.findByUserId(companyId);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        Optional<CompanySettings> opt = companySettingsRepository.findByCompanyId(companyId);
        if (opt.isPresent()) {
            return ResponseEntity.ok(opt.get().getSettingsJson());
        }
        
        // Return blank default settings object
        return ResponseEntity.ok("{}");
    }

    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody String settingsJson, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        CompanySettings settings = companySettingsRepository.findByCompanyId(companyId)
                .orElse(new CompanySettings());
        
        settings.setCompanyId(companyId);
        settings.setSettingsJson(settingsJson);
        companySettingsRepository.save(settings);

        return ResponseEntity.ok(settingsJson);
    }

    @GetMapping("/sidebar-counts")
    public ResponseEntity<?> getSidebarCounts(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();

        List<CompanyServiceRequest> requests = companyServiceRequestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);

        long pendingRequests = requests.stream()
                .filter(r -> r.getStatus() != null && r.getStatus().contains("PENDING"))
                .count();

        long unreadNotifications = notificationRepository.countByUserIdAndIsReadFalse(companyId);

        List<Conversation> conversations = conversationRepository.findAllByUserId(companyId);
        long unreadConversations = 0;
        for (Conversation c : conversations) {
            unreadConversations += messageRepository.countUnreadMessages(c.getId(), companyId);
        }

        long unpaidInvoices = transactionRepository.findAll().stream()
                .filter(t -> t.getUser() != null && t.getUser().getId().equals(companyId) && "PENDING".equalsIgnoreCase(t.getStatus()))
                .count();

        Map<String, Object> response = new HashMap<>();
        response.put("pendingRequests", pendingRequests);
        response.put("pendingReviews", 0);
        response.put("unreadConversations", unreadConversations);
        response.put("unreadNotifications", unreadNotifications);
        response.put("unpaidInvoices", unpaidInvoices);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/available-vehicles")
    public ResponseEntity<?> getAvailableVehicles(Authentication authentication) {
        List<Vehicle> list = vehicleService.getAvailableVehicles();
        List<Map<String, Object>> result = list.stream().map(v -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", v.getId());
            map.put("brand", v.getBrand());
            map.put("model", v.getModel());
            map.put("licensePlate", v.getLicensePlate());
            map.put("dailyPrice", v.getDailyPrice());
            map.put("pricePerDay", v.getDailyPrice());
            map.put("location", v.getLocation());
            map.put("category", v.getCategory());
            map.put("type", v.getCategory());
            map.put("transmission", v.getTransmission());
            map.put("fuelType", v.getFuelType());
            map.put("seats", v.getSeats());
            map.put("photoUrl", v.getPhotoUrl());
            map.put("imageUrl", v.getPhotoUrl());
            map.put("rating", v.getRating());
            map.put("status", v.getStatus());
            map.put("available", v.getAvailable());
            if (v.getOwner() != null) {
                Map<String, Object> owner = new HashMap<>();
                owner.put("id", v.getOwner().getId());
                owner.put("firstName", v.getOwner().getFirstName());
                owner.put("lastName", v.getOwner().getLastName());
                map.put("owner", owner);
            }
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/available-drivers")
    public ResponseEntity<?> getAvailableDrivers(Authentication authentication) {
        // Find users with driver role
        List<UserEntity> drivers = userRepo.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName() == ERole.ROLE_DRIVER))
                .collect(Collectors.toList());
        return ResponseEntity.ok(drivers);
    }

    @GetMapping("/search")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> searchCompanyData(
            @RequestParam("q") String query,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long companyId = userDetails.getId();
        String q = query != null ? query.toLowerCase().trim() : "";

        List<CompanyServiceRequest> requests =
                companyServiceRequestRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);

        List<Map<String, Object>> serviceRequests = requests.stream()
                .filter(r -> q.isEmpty()
                        || String.valueOf(r.getId()).contains(q)
                        || (r.getCity() != null && r.getCity().toLowerCase().contains(q))
                        || (r.getVehicleType() != null && r.getVehicleType().toLowerCase().contains(q))
                        || (r.getType() != null && r.getType().toLowerCase().contains(q))
                        || (r.getStatus() != null && r.getStatus().toLowerCase().contains(q)))
                .limit(10)
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("label", (r.getType() != null ? r.getType() : "Demande") + " #" + r.getId());
                    m.put("meta", (r.getCity() != null ? r.getCity() : "—") + " • " + r.getStatus());
                    return m;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> conversations = conversationRepository.findAllByUserId(companyId).stream()
                .filter(c -> {
                    if (q.isEmpty()) return true;
                    UserEntity other = c.getOwner().getId().equals(companyId) ? c.getClient() : c.getOwner();
                    return (other.getFirstName() != null && other.getFirstName().toLowerCase().contains(q))
                            || (other.getLastName() != null && other.getLastName().toLowerCase().contains(q));
                })
                .limit(6)
                .map(c -> {
                    UserEntity other = c.getOwner().getId().equals(companyId) ? c.getClient() : c.getOwner();
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", c.getId());
                    m.put("label", other.getFirstName() + " " + other.getLastName());
                    m.put("meta", "Conversation");
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> results = new HashMap<>();
        results.put("requests", serviceRequests);
        results.put("conversations", conversations);
        return ResponseEntity.ok(results);
    }
}
