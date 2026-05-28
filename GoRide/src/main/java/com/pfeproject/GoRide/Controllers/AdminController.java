package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.config.AdminDemoSeeder;
import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private com.pfeproject.GoRide.repositories.BookingRepository bookingRepository;

    @Autowired
    private com.pfeproject.GoRide.services.ReviewService reviewService;

    @Autowired
    private com.pfeproject.GoRide.services.MessagingService messagingService;

    @Autowired
    private com.pfeproject.GoRide.services.NotificationService notificationService;

    @Autowired
    private com.pfeproject.GoRide.services.RideRequestService rideRequestService;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PlatformComplaintRepository platformComplaintRepository;

    @Autowired
    private SupportTicketRepository supportTicketRepository;

    @Autowired
    private PlatformReportRepository platformReportRepository;

    private static boolean isPaidTransaction(String status) {
        return "COMPLETED".equalsIgnoreCase(status) || "PAID".equalsIgnoreCase(status);
    }

    /** Encaissé = entrées clients / entreprises, hors versements et remboursements. */
    private static boolean countsTowardEncaisse(String type) {
        if (type == null) {
            return true;
        }
        return !"REFUND".equals(type) && !"DRIVER_PAYOUT".equals(type) && !"OWNER_PAYOUT".equals(type);
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats() {
        long totalUsers = userRepo.count();
        long registeredVehicles = vehicleRepository.count();
        
        double revenue = 0.0;
        List<Transaction> transactions = transactionRepository.findAll();
        for (Transaction t : transactions) {
            if (isPaidTransaction(t.getStatus())) {
                revenue += t.getAmount();
            }
        }

        long passengers = 0;
        long drivers = 0;
        long owners = 0;
        long companies = 0;

        List<UserEntity> allUsers = userRepo.findAll();
        for (UserEntity u : allUsers) {
            if (u.getRoles() != null) {
                for (Role r : u.getRoles()) {
                    if (r.getName() == ERole.ROLE_CLIENT || r.getName() == ERole.ROLE_USER) {
                        passengers++;
                    } else if (r.getName() == ERole.ROLE_DRIVER) {
                        drivers++;
                    } else if (r.getName() == ERole.ROLE_FLEET_OWNER) {
                        owners++;
                    } else if (r.getName() == ERole.ROLE_COMPANY) {
                        companies++;
                    }
                }
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("activePassengers", passengers);
        stats.put("activeDrivers", drivers);
        stats.put("activeOwners", owners);
        stats.put("activeCompanies", companies);
        stats.put("registeredVehicles", registeredVehicles);
        stats.put("revenue", revenue);
        long openReports = platformReportRepository.findAll().stream()
                .filter(r -> "NEW".equals(r.getStatus()) || "IN_REVIEW".equals(r.getStatus()))
                .count();

        stats.put("openReports", openReports);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/dashboard/growth")
    public ResponseEntity<?> getDashboardGrowth(@RequestParam(required = false, defaultValue = "7days") String period) {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime startDate;
            int daysToSubtract;

            if ("30days".equalsIgnoreCase(period)) {
                daysToSubtract = 30;
            } else {
                daysToSubtract = 6; // To include today, making it 7 days total
            }
            startDate = now.minusDays(daysToSubtract);

            // Initialize counts for each day
            Map<String, Integer> counts = new LinkedHashMap<>();
            for (int i = daysToSubtract; i >= 0; i--) {
                LocalDateTime day = now.minusDays(i);
                String label = day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.FRENCH);
                if (label != null && label.length() >= 1) {
                    label = label.substring(0, 1).toUpperCase() + label.substring(1); // Capitalize
                }
                if ("30days".equalsIgnoreCase(period)) {
                    label = day.getDayOfMonth() + "/" + day.getMonthValue();
                }
                // Use date string as key to avoid duplicate names in 30 days, or just append index
                counts.put(i + "_" + label, 0); 
            }

            // Volume d'activité : transactions par jour (locations, paiements, etc.)
            List<Transaction> transactions = transactionRepository.findAll();
            for (Transaction t : transactions) {
                LocalDateTime createdAt = t.getCreatedAt();
                if (createdAt == null) {
                    continue;
                }
                if (createdAt.isBefore(startDate.toLocalDate().atStartOfDay()) || createdAt.isAfter(now)) {
                    continue;
                }
                long daysAgo = Duration.between(
                        createdAt.toLocalDate().atStartOfDay(),
                        now.toLocalDate().atStartOfDay()).toDays();
                if (daysAgo >= 0 && daysAgo <= daysToSubtract) {
                    int idx = (int) daysAgo;
                    for (String key : counts.keySet()) {
                        if (key.startsWith(idx + "_")) {
                            counts.put(key, counts.get(key) + 1);
                            break;
                        }
                    }
                }
            }

            List<Map<String, Object>> result = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : counts.entrySet()) {
                Map<String, Object> point = new HashMap<>();
                String label = entry.getKey().substring(entry.getKey().indexOf("_") + 1);
                point.put("label", label);
                point.put("value", entry.getValue());
                result.add(point);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("cause", e.toString());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepo.findAll());
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<?> verifyUser(@PathVariable Long id) {
        UserEntity user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setVerificationStatus("VERIFIED");
        user.setEnabled(true);
        userRepo.save(user);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{id}/suspend")
    public ResponseEntity<?> suspendUser(@PathVariable Long id) {
        UserEntity user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setVerificationStatus("SUSPENDED");
        user.setEnabled(false);
        userRepo.save(user);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/vehicles")
    public ResponseEntity<?> getAllVehicles() {
        return ResponseEntity.ok(vehicleRepository.findAll());
    }

    @PutMapping("/vehicles/{id}/approve")
    public ResponseEntity<?> approveVehicle(@PathVariable Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé"));
        vehicle.setStatus(VehicleStatus.AVAILABLE);
        vehicle.setAvailable(true);
        vehicleRepository.save(vehicle);
        return ResponseEntity.ok(vehicle);
    }

    @PutMapping("/vehicles/{id}/suspend")
    public ResponseEntity<?> suspendVehicle(@PathVariable Long id) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé"));
        vehicle.setStatus(VehicleStatus.MAINTENANCE);
        vehicle.setAvailable(false);
        vehicleRepository.save(vehicle);
        return ResponseEntity.ok(vehicle);
    }

    @GetMapping("/validations")
    public ResponseEntity<?> getValidations() {
        List<Map<String, Object>> pending = new ArrayList<>();
        for (Vehicle v : vehicleRepository.findAll()) {
            if (v.getStatus() == VehicleStatus.MAINTENANCE || !v.getAvailable()) {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", v.getId());
                dto.put("name", v.getBrand() + " " + v.getModel() + " — " + v.getLicensePlate());
                dto.put("type", "Véhicule");
                dto.put("priority", v.getStatus() == VehicleStatus.MAINTENANCE ? "Urgent" : "À valider");
                dto.put("location", v.getLocation());
                dto.put("status", v.getStatus() != null ? v.getStatus().name() : "PENDING");
                pending.add(dto);
            }
        }
        return ResponseEntity.ok(pending.stream().limit(5).toList());
    }

    @GetMapping("/dashboard/recent-activity")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getRecentActivity() {
        List<Map<String, Object>> items = new ArrayList<>();

        transactionRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(4)
                .forEach(t -> items.add(toActivityFromTransaction(t)));

        platformComplaintRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(3)
                .forEach(c -> items.add(toActivityFromComplaint(c)));

        supportTicketRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(2)
                .forEach(t -> items.add(toActivityFromSupport(t)));

        items.sort((a, b) -> {
            LocalDateTime da = (LocalDateTime) a.get("createdAt");
            LocalDateTime db = (LocalDateTime) b.get("createdAt");
            if (da == null || db == null) {
                return 0;
            }
            return db.compareTo(da);
        });

        List<Map<String, Object>> result = new ArrayList<>();
        int limit = Math.min(6, items.size());
        for (int i = 0; i < limit; i++) {
            Map<String, Object> row = new LinkedHashMap<>(items.get(i));
            row.remove("createdAt");
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/payments")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAllPayments() {
        List<Map<String, Object>> list = transactionRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toPaymentDto)
                .toList();
        return ResponseEntity.ok(list);
    }

    private Map<String, Object> toPaymentDto(Transaction t) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", t.getId());
        dto.put("transactionId", t.getTransactionId());
        dto.put("displayId", t.getTransactionId() != null ? t.getTransactionId() : "TX-" + t.getId());
        dto.put("title", t.getTitle());
        dto.put("type", t.getType());
        dto.put("amount", t.getAmount());
        String status = t.getStatus();
        if ("COMPLETED".equalsIgnoreCase(status)) {
            status = "PAID";
        }
        dto.put("status", status);
        dto.put("createdAt", t.getCreatedAt());
        dto.put("receiverName", receiverLabelForPaymentType(t.getType()));

        if (t.getUser() != null) {
            Map<String, Object> user = new HashMap<>();
            user.put("firstName", t.getUser().getFirstName());
            user.put("lastName", t.getUser().getLastName());
            user.put("email", t.getUser().getEmail());
            dto.put("user", user);
        }
        return dto;
    }

    private static String receiverLabelForPaymentType(String type) {
        if (type == null) {
            return "GoRide Plateforme";
        }
        return switch (type) {
            case "DRIVER_PAYOUT" -> "Chauffeur (Imed Kilani)";
            case "COMMISSION", "GORIDE_COMMISSION" -> "GoRide — Commission";
            case "COMPANY_PAYMENT" -> "Propriétaire flotte";
            case "OWNER_PAYOUT" -> "Ahmed Abidi — Flotte";
            case "REFUND" -> "Client (remboursement)";
            default -> "GoRide Plateforme";
        };
    }

    @GetMapping("/payments/stats")
    public ResponseEntity<?> getPaymentsStats() {
        List<Transaction> transactions = transactionRepository.findAll();
        
        double totalCollected = 0.0;
        double commissionTotal = 0.0;
        int successfulCount = 0;
        int pendingInvoices = 0;
        int refundCount = 0;
        int failedCount = 0;

        for (Transaction t : transactions) {
            String status = t.getStatus();
            double amount = t.getAmount() != null ? t.getAmount() : 0.0;
            if (isPaidTransaction(status)) {
                successfulCount++;
                if (countsTowardEncaisse(t.getType())) {
                    totalCollected += amount;
                    commissionTotal += amount * 0.1;
                }
            } else if ("FAILED".equalsIgnoreCase(status)) {
                failedCount++;
            } else if ("PENDING".equalsIgnoreCase(status)) {
                // Approximate pending invoices with pending transactions
                pendingInvoices++;
            }
            
            // Assume type REFUND is handled if we have type. We just check status here too if there's a refunded status.
            if ("REFUNDED".equalsIgnoreCase(status)) {
                refundCount++;
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCollected", totalCollected);
        stats.put("successfulCount", successfulCount);
        stats.put("pendingInvoices", pendingInvoices);
        stats.put("refundCount", refundCount);
        stats.put("commissionTotal", commissionTotal);
        stats.put("failedCount", failedCount);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/revenue/stats")
    public ResponseEntity<?> getRevenueStats() {
        double totalVolume = 0.0;
        double totalCommissions = 0.0;

        List<Transaction> transactions = transactionRepository.findAll();
        for (Transaction t : transactions) {
            if (isPaidTransaction(t.getStatus())) {
                totalVolume += t.getAmount();
                totalCommissions += t.getAmount() * 0.1; // 10% platform commission
            }
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRevenue", totalVolume);
        stats.put("commissionRevenue", totalCommissions);
        stats.put("transactionsCount", transactions.size());

        return ResponseEntity.ok(stats);
    }

    /**
     * Évolution du chiffre d'affaires (transactions payées) pour le graphique admin.
     * period=30days → 4 semaines ; period=year → 6 derniers mois.
     */
    @GetMapping("/revenue/evolution")
    public ResponseEntity<?> getRevenueEvolution(
            @RequestParam(required = false, defaultValue = "30days") String period) {
        List<Transaction> paid = transactionRepository.findAll().stream()
                .filter(t -> isPaidTransaction(t.getStatus()))
                .toList();

        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> result = new ArrayList<>();

        if ("year".equalsIgnoreCase(period)) {
            for (int m = 5; m >= 0; m--) {
                LocalDateTime monthStart = now.minusMonths(m).withDayOfMonth(1).toLocalDate().atStartOfDay();
                LocalDateTime monthEnd = monthStart.plusMonths(1).minusSeconds(1);
                double sum = sumTransactionsInRange(paid, monthStart, monthEnd);
                Map<String, Object> point = new LinkedHashMap<>();
                String label = monthStart.format(DateTimeFormatter.ofPattern("MMM", Locale.FRENCH));
                if (label != null && !label.isEmpty()) {
                    label = label.substring(0, 1).toUpperCase(Locale.FRENCH) + label.substring(1);
                }
                point.put("label", label);
                point.put("month", label);
                point.put("amount", Math.round(sum));
                result.add(point);
            }
        } else {
            for (int w = 3; w >= 0; w--) {
                LocalDateTime weekEnd = now.minusDays(w * 7L).toLocalDate().atTime(23, 59, 59);
                LocalDateTime weekStart = weekEnd.minusDays(6).toLocalDate().atStartOfDay();
                double sum = sumTransactionsInRange(paid, weekStart, weekEnd);
                Map<String, Object> point = new LinkedHashMap<>();
                String label = weekStart.format(DateTimeFormatter.ofPattern("dd/MM", Locale.FRENCH));
                point.put("label", label);
                point.put("month", "Sem. " + (4 - w));
                point.put("amount", Math.round(sum));
                result.add(point);
            }
        }

        return ResponseEntity.ok(result);
    }

    private static double sumTransactionsInRange(
            List<Transaction> transactions, LocalDateTime start, LocalDateTime end) {
        double sum = 0.0;
        for (Transaction t : transactions) {
            LocalDateTime createdAt = t.getCreatedAt();
            if (createdAt == null) {
                continue;
            }
            if (!createdAt.isBefore(start) && !createdAt.isAfter(end)) {
                sum += t.getAmount();
            }
        }
        return sum;
    }

    @GetMapping("/complaints")
    public ResponseEntity<?> getComplaints() {
        List<Map<String, Object>> list = platformComplaintRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toComplaintDto)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/support")
    public ResponseEntity<?> getSupportTickets() {
        List<Map<String, Object>> list = supportTicketRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toSupportDto)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports() {
        List<Map<String, Object>> list = platformReportRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toReportDto)
                .toList();
        return ResponseEntity.ok(list);
    }

    private Map<String, Object> toActivityFromTransaction(Transaction t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", "Paiement — " + t.getTitle());
        String status = t.getStatus();
        if ("COMPLETED".equalsIgnoreCase(status)) {
            status = "Payé";
        } else if ("PENDING".equalsIgnoreCase(status)) {
            status = "En attente";
        } else if ("FAILED".equalsIgnoreCase(status)) {
            status = "Échoué";
        } else if ("REFUNDED".equalsIgnoreCase(status)) {
            status = "Remboursé";
        }
        m.put("desc", String.format(Locale.FRENCH, "%.0f DT — %s", t.getAmount(), status));
        m.put("time", formatRelativeTimeFrench(t.getCreatedAt()));
        m.put("icon", activityIconForTransactionType(t.getType()));
        m.put("createdAt", t.getCreatedAt());
        return m;
    }

    private Map<String, Object> toActivityFromComplaint(PlatformComplaint c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", "Réclamation — " + c.getTitle());
        m.put("desc", c.getComplainantName() + " · " + complaintCategoryLabel(c.getCategory()));
        m.put("time", formatRelativeTimeFrench(c.getCreatedAt()));
        m.put("icon", "ion-ios-warning");
        m.put("createdAt", c.getCreatedAt());
        return m;
    }

    private Map<String, Object> toActivityFromSupport(SupportTicket t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", "Support — " + t.getSubject());
        m.put("desc", t.getRequesterName() + " · " + supportStatusLabel(t.getStatus()));
        m.put("time", formatRelativeTimeFrench(t.getCreatedAt()));
        m.put("icon", "ion-ios-chatbubbles");
        m.put("createdAt", t.getCreatedAt());
        return m;
    }

    private static String formatRelativeTimeFrench(LocalDateTime at) {
        if (at == null) {
            return "—";
        }
        long hours = Duration.between(at, LocalDateTime.now()).toHours();
        if (hours < 1) {
            return "À l'instant";
        }
        if (hours < 24) {
            return "Il y a " + hours + " h";
        }
        long days = hours / 24;
        if (days == 1) {
            return "Hier";
        }
        if (days < 7) {
            return "Il y a " + days + " j";
        }
        return at.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRENCH));
    }

    private static String activityIconForTransactionType(String type) {
        if (type == null) {
            return "ion-ios-cash";
        }
        return switch (type) {
            case "RENTAL", "TRIP", "PASSENGER_PAYMENT" -> "ion-ios-car";
            case "REFUND" -> "ion-ios-undo";
            case "COMPANY_PAYMENT", "OWNER_PAYOUT", "DRIVER_PAYOUT" -> "ion-ios-briefcase";
            case "GORIDE_COMMISSION", "COMMISSION" -> "ion-ios-pie";
            case "RECHARGE" -> "ion-ios-wallet";
            default -> "ion-ios-cash";
        };
    }

    private static String complaintCategoryLabel(String category) {
        if (category == null) {
            return "Réclamation";
        }
        return switch (category) {
            case "PAYMENT" -> "Paiement";
            case "SERVICE" -> "Service";
            case "BEHAVIOR" -> "Comportement";
            case "SAFETY" -> "Sécurité";
            default -> category;
        };
    }

    private static String supportStatusLabel(String status) {
        if (status == null) {
            return "Ouvert";
        }
        return switch (status) {
            case "OPEN" -> "Ouvert";
            case "IN_PROGRESS" -> "En cours";
            case "WAITING_USER" -> "En attente client";
            case "RESOLVED" -> "Résolu";
            default -> status;
        };
    }

    private Map<String, Object> toComplaintDto(PlatformComplaint c) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", c.getCaseId());
        m.put("title", c.getTitle());
        m.put("description", c.getDescription());
        m.put("complainantName", c.getComplainantName());
        m.put("complainantRole", c.getComplainantRole());
        m.put("accusedName", c.getAccusedName());
        m.put("accusedRole", c.getAccusedRole());
        m.put("category", c.getCategory());
        m.put("priority", c.getPriority());
        m.put("status", c.getStatus());
        m.put("relatedServiceId", c.getRelatedServiceId());
        m.put("createdAt", c.getCreatedAt());
        m.put("updatedAt", c.getUpdatedAt());
        return m;
    }

    private Map<String, Object> toSupportDto(SupportTicket t) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getCaseId());
        m.put("subject", t.getSubject());
        m.put("requesterName", t.getRequesterName());
        m.put("requesterRole", t.getRequesterRole());
        m.put("category", t.getCategory());
        m.put("priority", t.getPriority());
        m.put("status", t.getStatus());
        m.put("assignedTo", t.getAssignedTo());
        m.put("createdAt", t.getCreatedAt());
        m.put("updatedAt", t.getUpdatedAt());
        return m;
    }

    private Map<String, Object> toReportDto(PlatformReport r) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getCaseId());
        m.put("title", r.getTitle());
        m.put("reason", r.getReason());
        m.put("description", r.getDescription());
        m.put("reporterName", r.getReporterName());
        m.put("reporterRole", r.getReporterRole());
        m.put("reportedName", r.getReportedName());
        m.put("reportedRole", r.getReportedRole());
        m.put("reportType", r.getReportType());
        m.put("priority", r.getPriority());
        m.put("status", r.getStatus());
        m.put("relatedEntityType", r.getRelatedEntityType());
        m.put("relatedServiceId", r.getRelatedServiceId());
        m.put("assignedTo", r.getAssignedTo());
        m.put("createdAt", r.getCreatedAt());
        m.put("updatedAt", r.getUpdatedAt());
        return m;
    }

    @GetMapping("/reviews")
    public ResponseEntity<?> getReviews() {
        return ResponseEntity.ok(reviewRepository.findAll());
    }

    @GetMapping("/notifications")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getNotifications() {
        Optional<UserEntity> adminOpt = userRepo.findByEmail("admin@goride.tn");
        if (adminOpt.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        List<Map<String, Object>> list = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(adminOpt.get().getId())
                .stream()
                .map(this::toAdminNotificationDto)
                .toList();
        return ResponseEntity.ok(list);
    }

    private Map<String, Object> toAdminNotificationDto(Notification n) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", n.getId());
        dto.put("title", n.getTitle());
        dto.put("message", stripDemoMarker(n.getMessage()));
        dto.put("type", mapNotificationTypeForAdmin(n.getType(), n.getTargetUrl()));
        dto.put("priority", inferNotificationPriority(n));
        dto.put("status", Boolean.TRUE.equals(n.getIsRead()) ? "READ" : "NEW");
        dto.put("isRead", Boolean.TRUE.equals(n.getIsRead()));
        dto.put("createdAt", n.getCreatedAt());
        dto.put("targetUrl", n.getTargetUrl());
        return dto;
    }

    private static String stripDemoMarker(String message) {
        if (message == null) {
            return "";
        }
        return message.replace(AdminDemoSeeder.MARKER, "").trim();
    }

    private static String mapNotificationTypeForAdmin(String type, String targetUrl) {
        if (type == null) {
            return "SYSTEM";
        }
        return switch (type) {
            case "WARNING" -> "COMPLAINT";
            case "DANGER" -> "REPORT";
            case "INFO" -> {
                if (targetUrl != null && targetUrl.contains("payments")) {
                    yield "PAYMENT";
                }
                if (targetUrl != null && targetUrl.contains("support")) {
                    yield "SUPPORT";
                }
                if (targetUrl != null && targetUrl.contains("validations")) {
                    yield "VALIDATION";
                }
                yield "SYSTEM";
            }
            case "SUCCESS" -> "SERVICE";
            default -> type;
        };
    }

    private static String inferNotificationPriority(Notification n) {
        String type = mapNotificationTypeForAdmin(n.getType(), n.getTargetUrl());
        String title = n.getTitle() != null ? n.getTitle().toLowerCase(Locale.FRENCH) : "";
        if (title.contains("prioritaire") || title.contains("urgent") || "REPORT".equals(type)) {
            return "HIGH";
        }
        if ("COMPLAINT".equals(type) && title.contains("double débit")) {
            return "HIGH";
        }
        if ("PAYMENT".equals(type) && (title.contains("attente") || title.contains("750"))) {
            return "HIGH";
        }
        if ("VALIDATION".equals(type) || "SUPPORT".equals(type)) {
            return "MEDIUM";
        }
        return "LOW";
    }

    @GetMapping("/sidebar-counts")
    public ResponseEntity<?> getSidebarCounts() {
        long pendingPayments = 0;
        List<Transaction> transactions = transactionRepository.findAll();
        for (Transaction t : transactions) {
            if ("PENDING".equalsIgnoreCase(t.getStatus())) {
                pendingPayments++;
            }
        }

        long openSupport = supportTicketRepository.findAll().stream()
                .filter(t -> "OPEN".equals(t.getStatus()) || "IN_PROGRESS".equals(t.getStatus())
                        || "WAITING_USER".equals(t.getStatus()))
                .count();
        long openComplaints = platformComplaintRepository.findAll().stream()
                .filter(c -> "OPEN".equals(c.getStatus()) || "IN_REVIEW".equals(c.getStatus())
                        || "WAITING_RESPONSE".equals(c.getStatus()))
                .count();
        long openReports = platformReportRepository.findAll().stream()
                .filter(r -> "NEW".equals(r.getStatus()) || "IN_REVIEW".equals(r.getStatus()))
                .count();

        long unreadNotifications = userRepo.findByEmail("admin@goride.tn")
                .map(admin -> notificationRepository.countByUserIdAndIsReadFalse(admin.getId()))
                .orElse(0L);

        long pendingValidations = 0;
        List<Vehicle> allVehicles = vehicleRepository.findAll();
        for (Vehicle v : allVehicles) {
            if (v.getStatus() == VehicleStatus.MAINTENANCE || !v.getAvailable()) {
                pendingValidations++;
            }
        }

        Map<String, Long> counts = new HashMap<>();
        counts.put("payments", pendingPayments);
        counts.put("support", openSupport);
        counts.put("complaints", openComplaints);
        counts.put("reports", openReports);
        counts.put("notifications", unreadNotifications);
        counts.put("validations", pendingValidations);

        return ResponseEntity.ok(counts);
    }
}
