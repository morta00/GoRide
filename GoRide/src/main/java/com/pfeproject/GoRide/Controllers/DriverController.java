package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.entities.ERole;
import com.pfeproject.GoRide.entities.RideRequest;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.repositories.DriverProfileRepository;
import com.pfeproject.GoRide.repositories.RideRequestRepository;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/driver")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DriverController {

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private DriverProfileRepository driverProfileRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private UserRepo userRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.ActivityRepository activityRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.UserDocumentRepository userDocumentRepository;

    @Autowired
    private com.pfeproject.GoRide.services.BookingService bookingService;

    /**
     * GET /api/driver/covoiturage-requests
     * Demandes d'inscription covoiturage (réservations sur les trajets du chauffeur connecté).
     */
    @GetMapping("/covoiturage-requests")
    public ResponseEntity<?> getCovoiturageRequests(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getDriverInboxBookings(userDetails.getId()));
    }

    @GetMapping("/work-vehicle")
    public ResponseEntity<?> getWorkVehicle(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<Vehicle> driverVehicles = vehicleRepository.findByDriverId(userId);
        Vehicle activeVehicle = null;
        String mode = null;

        if (!driverVehicles.isEmpty()) {
            activeVehicle = driverVehicles.get(0);
            if (activeVehicle.getOwner() != null && activeVehicle.getOwner().getId().equals(userId)) {
                mode = "OWN_VEHICLE";
            } else {
                mode = "RENTED_VEHICLE";
            }
        } else {
            List<Vehicle> ownedVehicles = vehicleRepository.findByOwnerId(userId);
            if (!ownedVehicles.isEmpty()) {
                activeVehicle = ownedVehicles.get(0);
                mode = "OWN_VEHICLE";
            }
        }

        Map<String, Object> response = new HashMap<>();
        if (activeVehicle == null) {
            response.put("configured", false);
            response.put("vehicle", null);
            response.put("mode", null);
        } else {
            response.put("configured", true);
            response.put("mode", mode);

            Map<String, Object> vMap = new HashMap<>();
            vMap.put("id", activeVehicle.getId());
            vMap.put("brand", activeVehicle.getBrand());
            vMap.put("model", activeVehicle.getModel());
            vMap.put("licensePlate", activeVehicle.getLicensePlate());
            vMap.put("status", activeVehicle.getStatus() != null ? activeVehicle.getStatus().name() : "AVAILABLE");
            vMap.put("year", activeVehicle.getYear() != null ? activeVehicle.getYear() : 2022);
            vMap.put("color", activeVehicle.getColor() != null ? activeVehicle.getColor() : "Non renseigné");
            vMap.put("fuelType", activeVehicle.getFuelType() != null ? activeVehicle.getFuelType() : "Non renseigné");
            vMap.put("transmission", activeVehicle.getTransmission() != null ? activeVehicle.getTransmission() : "Non renseigné");
            vMap.put("mileage", activeVehicle.getMileage() != null ? activeVehicle.getMileage() : 0);
            vMap.put("seats", activeVehicle.getSeats() != null ? activeVehicle.getSeats() : 4);

            if ("RENTED_VEHICLE".equals(mode) && activeVehicle.getOwner() != null) {
                String fn = activeVehicle.getOwner().getFirstName();
                String ln = activeVehicle.getOwner().getLastName();
                String ownerName = ((fn != null ? fn : "") + " " + (ln != null ? ln : "")).trim();
                if (ownerName.isEmpty()) {
                    ownerName = activeVehicle.getOwner().getEmail();
                }
                vMap.put("ownerName", ownerName);
            }
            response.put("vehicle", vMap);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/driver/vehicle — véhicule assigné au chauffeur (utilisé par le frontend).
     */
    @GetMapping("/vehicle")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> getAssignedVehicle(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Vehicle vehicle = vehicleRepository.findByDriverId(userDetails.getId())
                .stream().findFirst().orElse(null);

        if (vehicle == null) {
            return ResponseEntity.noContent().build();
        }

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", vehicle.getId());
        dto.put("brand", vehicle.getBrand());
        dto.put("model", vehicle.getModel());
        dto.put("licensePlate", vehicle.getLicensePlate());
        dto.put("dailyPrice", vehicle.getDailyPrice());
        dto.put("status", vehicle.getStatus() != null ? vehicle.getStatus().name() : null);
        dto.put("photoUrl", vehicle.getPhotoUrl());
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/vehicle")
    public ResponseEntity<?> addPersonalVehicle(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long driverId = userDetails.getId();

            com.pfeproject.GoRide.entities.UserEntity user = userRepository.findById(driverId)
                    .orElseThrow(() -> new RuntimeException("Chauffeur non trouvé."));

            // Create and save personal vehicle
            Vehicle vehicle = new Vehicle();
            vehicle.setBrand((String) body.get("brand"));
            vehicle.setModel((String) body.get("model"));
            vehicle.setLicensePlate((String) body.get("licensePlate"));
            vehicle.setDailyPrice(0.0);
            vehicle.setStatus(com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE);

            Object seatsObj = body.get("seats");
            vehicle.setSeats(seatsObj instanceof Number ? ((Number) seatsObj).intValue() : 4);
            vehicle.setFuelType((String) body.get("fuelType"));
            vehicle.setColor((String) body.get("color"));
            vehicle.setTransmission((String) body.get("transmission"));

            Object yearObj = body.get("productionYear");
            if (yearObj == null) {
                yearObj = body.get("year");
            }
            vehicle.setYear(yearObj instanceof Number ? ((Number) yearObj).intValue() : 2022);

            Object mileageObj = body.get("mileage");
            vehicle.setMileage(mileageObj instanceof Number ? ((Number) mileageObj).intValue() : 0);

            vehicle.setOwner(user);
            vehicle.setDriver(user);

            Vehicle saved = vehicleRepository.save(vehicle);

            // Log activity in MySQL
            com.pfeproject.GoRide.entities.Activity activity = com.pfeproject.GoRide.entities.Activity.builder()
                    .title("Véhicule personnel ajouté")
                    .description("Vous avez configuré votre véhicule " + saved.getBrand() + " " + saved.getModel())
                    .type("VEHICLE")
                    .category("success")
                    .user(user)
                    .createdAt(LocalDateTime.now())
                    .build();
            activityRepository.save(activity);

            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/work-vehicle")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> removeWorkVehicle(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();
        
        com.pfeproject.GoRide.entities.UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Chauffeur non trouvé."));

        List<Vehicle> driverVehicles = vehicleRepository.findByDriverId(userId);
        for (Vehicle v : driverVehicles) {
            v.setDriver(null);
            vehicleRepository.save(v);
        }
        
        List<Vehicle> ownedVehicles = vehicleRepository.findByOwnerId(userId);
        for (Vehicle v : ownedVehicles) {
            vehicleRepository.delete(v);
        }
        
        // Log activity
        com.pfeproject.GoRide.entities.Activity activity = com.pfeproject.GoRide.entities.Activity.builder()
                .title("Véhicule de travail retiré")
                .description("Vous avez retiré votre véhicule de travail actif.")
                .type("VEHICLE")
                .category("warning")
                .user(user)
                .createdAt(LocalDateTime.now())
                .build();
        activityRepository.save(activity);
        
        return ResponseEntity.ok(Map.of("message", "Véhicule retiré avec succès."));
    }

    @GetMapping("/documents")
    public ResponseEntity<?> getDriverDocuments(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();
        return ResponseEntity.ok(userDocumentRepository.findByUserId(userId));
    }

    @GetMapping("/vehicle-history")
    public ResponseEntity<?> getVehicleHistory(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();
        List<com.pfeproject.GoRide.entities.Activity> all = activityRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        List<com.pfeproject.GoRide.entities.Activity> filtered = all.stream()
            .filter(act -> "VEHICLE".equalsIgnoreCase(act.getType()) 
                        || (act.getTitle() != null && (act.getTitle().toLowerCase().contains("véhicule") 
                                                    || act.getTitle().toLowerCase().contains("location") 
                                                    || act.getTitle().toLowerCase().contains("voiture"))))
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDriverDashboard(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        LocalDate today = LocalDate.now();

        // 1. Fetch all rides for this driver
        List<RideRequest> driverRides = rideRequestRepository.findByDriverIdOrderByCreatedAtDesc(userId);

        // 2. todayRevenue (COMPLETED today)
        double todayRevenue = driverRides.stream()
                .filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus()))
                .filter(r -> r.getCreatedAt().toLocalDate().isEqual(today))
                .mapToDouble(r -> r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0)
                .sum();

        // 3. monthlyTrips (ACCEPTED, IN_PROGRESS, COMPLETED in current month)
        long monthlyTrips = driverRides.stream()
                .filter(r -> Arrays.asList("ACCEPTED", "IN_PROGRESS", "COMPLETED").contains(r.getStatus().toUpperCase()))
                .filter(r -> r.getCreatedAt().getMonth() == today.getMonth() && r.getCreatedAt().getYear() == today.getYear())
                .count();

        // 4. pendingRequests (PENDING status overall)
        long pendingRequests = rideRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING").size();

        // 5. averageRating from driver profile
        double averageRating = driverProfileRepository.findByUserId(userId)
                .map(p -> p.getRating() != null ? p.getRating() : 0.0)
                .orElse(0.0);

        // 6. weeklyActivity (Revenues by day for the current week: Mon to Sun)
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        Map<DayOfWeek, Double> dayRevenueMap = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek day : DayOfWeek.values()) {
            dayRevenueMap.put(day, 0.0);
        }

        // Aggregate completed ride revenues of this week
        driverRides.stream()
                .filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus()))
                .filter(r -> !r.getCreatedAt().toLocalDate().isBefore(startOfWeek) && !r.getCreatedAt().toLocalDate().isAfter(today))
                .forEach(r -> {
                    DayOfWeek day = r.getCreatedAt().getDayOfWeek();
                    double price = r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0;
                    dayRevenueMap.put(day, dayRevenueMap.get(day) + price);
                });

        String[] labels = {"Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"};
        DayOfWeek[] days = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY};

        List<Map<String, Object>> weeklyActivity = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            Map<String, Object> dayAct = new HashMap<>();
            dayAct.put("label", labels[i]);
            dayAct.put("value", dayRevenueMap.get(days[i]));
            weeklyActivity.add(dayAct);
        }

        // 7. recentTrips (recent rides formatted for front)
        List<Map<String, Object>> recentTrips = driverRides.stream()
                .limit(5)
                .map(r -> {
                    Map<String, Object> trip = new HashMap<>();
                    trip.put("id", String.valueOf(r.getId()));
                    trip.put("date", r.getCreatedAt().toString());
                    trip.put("to", r.getDestination());
                    trip.put("amount", r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0);

                    // Map backend status to frontend RideStatus:
                    // PENDING -> en_attente, ACCEPTED -> acceptee, IN_PROGRESS -> en_cours, COMPLETED -> terminee, CANCELLED -> annulee
                    String frontStatus = "en_attente";
                    if ("ACCEPTED".equalsIgnoreCase(r.getStatus())) frontStatus = "acceptee";
                    else if ("IN_PROGRESS".equalsIgnoreCase(r.getStatus())) frontStatus = "en_cours";
                    else if ("COMPLETED".equalsIgnoreCase(r.getStatus())) frontStatus = "terminee";
                    else if ("CANCELLED".equalsIgnoreCase(r.getStatus()) || "REJECTED".equalsIgnoreCase(r.getStatus())) frontStatus = "annulee";

                    trip.put("status", frontStatus);
                    return trip;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("todayRevenue", todayRevenue);
        response.put("monthlyTrips", monthlyTrips);
        response.put("pendingRequests", pendingRequests);
        response.put("averageRating", averageRating);
        response.put("weeklyActivity", weeklyActivity);
        response.put("recentTrips", recentTrips);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/earnings")
    public ResponseEntity<?> getDriverEarnings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        LocalDate today = LocalDate.now();

        // 1. Fetch all rides for this driver
        List<RideRequest> driverRides = rideRequestRepository.findByDriverIdOrderByCreatedAtDesc(userId);

        // 2. Filter completed rides
        List<RideRequest> completedRides = driverRides.stream()
                .filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus()))
                .collect(Collectors.toList());

        // 3. todayEarnings (net today: completed rides today * 0.85 + tips)
        double todayEarnings = completedRides.stream()
                .filter(r -> r.getCreatedAt().toLocalDate().isEqual(today))
                .mapToDouble(r -> {
                    double gross = r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0;
                    double tip = (r.getId() % 3 == 0) ? (r.getId() % 5 + 1.0) : 0.0;
                    return (gross * 0.85) + tip;
                })
                .sum();

        // 4. weekEarnings (net this week)
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        double weekEarnings = completedRides.stream()
                .filter(r -> !r.getCreatedAt().toLocalDate().isBefore(startOfWeek) && !r.getCreatedAt().toLocalDate().isAfter(today))
                .mapToDouble(r -> {
                    double gross = r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0;
                    double tip = (r.getId() % 3 == 0) ? (r.getId() % 5 + 1.0) : 0.0;
                    return (gross * 0.85) + tip;
                })
                .sum();

        // 5. monthEarnings (net this month)
        double monthEarnings = completedRides.stream()
                .filter(r -> r.getCreatedAt().getMonth() == today.getMonth() && r.getCreatedAt().getYear() == today.getYear())
                .mapToDouble(r -> {
                    double gross = r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0;
                    double tip = (r.getId() % 3 == 0) ? (r.getId() % 5 + 1.0) : 0.0;
                    return (gross * 0.85) + tip;
                })
                .sum();

        // 6. stats Map matching EarningStats frontend model:
        long todayRides = completedRides.stream()
                .filter(r -> r.getCreatedAt().toLocalDate().isEqual(today))
                .count();

        long weekRides = completedRides.stream()
                .filter(r -> !r.getCreatedAt().toLocalDate().isBefore(startOfWeek) && !r.getCreatedAt().toLocalDate().isAfter(today))
                .count();

        long monthRides = completedRides.stream()
                .filter(r -> r.getCreatedAt().getMonth() == today.getMonth() && r.getCreatedAt().getYear() == today.getYear())
                .count();

        double averagePerRide = monthRides > 0 ? monthEarnings / monthRides : 0.0;

        // Calculate weeklyData (net revenues by day Monday to Sunday)
        Map<DayOfWeek, Double> dayRevenueMap = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek day : DayOfWeek.values()) {
            dayRevenueMap.put(day, 0.0);
        }
        completedRides.stream()
                .filter(r -> !r.getCreatedAt().toLocalDate().isBefore(startOfWeek) && !r.getCreatedAt().toLocalDate().isAfter(today))
                .forEach(r -> {
                    DayOfWeek day = r.getCreatedAt().getDayOfWeek();
                    double gross = r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0;
                    double tip = (r.getId() % 3 == 0) ? (r.getId() % 5 + 1.0) : 0.0;
                    double net = (gross * 0.85) + tip;
                    dayRevenueMap.put(day, dayRevenueMap.get(day) + net);
                });

        List<Double> weeklyData = new ArrayList<>();
        DayOfWeek[] days = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY};
        for (DayOfWeek day : days) {
            weeklyData.add(dayRevenueMap.get(day));
        }

        List<String> weeklyLabels = Arrays.asList("Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim");

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayEarnings", todayEarnings);
        stats.put("weekEarnings", weekEarnings);
        stats.put("monthEarnings", monthEarnings);
        stats.put("todayRides", (double) todayRides);
        stats.put("weekRides", (double) weekRides);
        stats.put("monthRides", (double) monthRides);
        stats.put("averagePerRide", averagePerRide);
        stats.put("weeklyData", weeklyData);
        stats.put("weeklyLabels", weeklyLabels);

        // 7. Format earnings history list matching Earning frontend model
        List<Map<String, Object>> earningsList = driverRides.stream()
                .map(r -> {
                    Map<String, Object> e = new HashMap<>();
                    e.put("id", "E-" + r.getId());
                    e.put("rideId", String.valueOf(r.getId()));
                    e.put("date", r.getCreatedAt().toString());
                    e.put("passengerName", r.getClient() != null ? (r.getClient().getFirstName() + " " + r.getClient().getLastName()) : "Client GoRide");
                    e.put("from", r.getDeparture());
                    e.put("to", r.getDestination());
                    e.put("route", r.getDeparture() + " → " + r.getDestination());

                    double gross = r.getEstimatedPrice() != null ? r.getEstimatedPrice() : 0.0;
                    double comm = gross * 0.15;
                    double tip = (r.getId() % 3 == 0) ? (r.getId() % 5 + 1.0) : 0.0;
                    double net = gross - comm + tip;

                    e.put("grossAmount", gross);
                    e.put("commission", comm);
                    e.put("tip", tip);
                    e.put("netAmount", net);
                    e.put("paymentMethod", r.getPaymentMethod() != null ? r.getPaymentMethod().toLowerCase() : "cash");

                    String s = "PENDING";
                    if ("COMPLETED".equalsIgnoreCase(r.getStatus())) {
                        s = "PAID";
                    } else if ("CANCELLED".equalsIgnoreCase(r.getStatus()) || "REJECTED".equalsIgnoreCase(r.getStatus())) {
                        s = "CANCELLED";
                    }
                    e.put("status", s);

                    return e;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("stats", stats);
        response.put("earnings", earningsList);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/partner-vehicles")
    public ResponseEntity<?> getPartnerVehicles(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<Vehicle> partners = vehicleRepository.findAvailablePartnerVehicles(userId);

        List<Map<String, Object>> result = partners.stream().map(v -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", v.getId());
            map.put("brand", v.getBrand());
            map.put("model", v.getModel());
            map.put("licensePlate", v.getLicensePlate());
            map.put("dailyPrice", v.getDailyPrice());
            map.put("location", v.getLocation());
            map.put("category", v.getCategory());
            map.put("transmission", v.getTransmission());
            map.put("fuelType", v.getFuelType());
            map.put("seats", v.getSeats());
            map.put("photoUrl", v.getPhotoUrl());
            map.put("imageUrl", v.getPhotoUrl());
            map.put("description", v.getDescription());
            map.put("status", v.getStatus());
            map.put("rating", v.getRating());
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

    @Autowired
    private com.pfeproject.GoRide.repositories.TransactionRepository transactionRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.NotificationRepository notificationRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.ConversationRepository conversationRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.MessageRepository messageRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.ReviewRepository reviewRepository;

    @GetMapping("/payments")
    public ResponseEntity<?> getDriverPayments(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<com.pfeproject.GoRide.entities.Transaction> txList = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        double totalPaid = txList.stream()
                .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()) && !"WITHDRAWAL".equalsIgnoreCase(t.getType()))
                .mapToDouble(com.pfeproject.GoRide.entities.Transaction::getAmount)
                .sum();

        double pendingPayments = txList.stream()
                .filter(t -> "PENDING".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(com.pfeproject.GoRide.entities.Transaction::getAmount)
                .sum();

        double failedPayments = txList.stream()
                .filter(t -> "FAILED".equalsIgnoreCase(t.getStatus()) || "CANCELLED".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(com.pfeproject.GoRide.entities.Transaction::getAmount)
                .sum();

        double availableBalance = 0.0;
        Optional<com.pfeproject.GoRide.entities.UserEntity> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            availableBalance = userOpt.get().getWalletBalance() != null ? userOpt.get().getWalletBalance() : 0.0;
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("availableBalance", availableBalance);
        summary.put("pendingEarnings", pendingPayments);
        summary.put("totalWithdrawn", txList.stream()
                .filter(t -> "WITHDRAWAL".equalsIgnoreCase(t.getType()) && "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(com.pfeproject.GoRide.entities.Transaction::getAmount)
                .sum());
        summary.put("nextPayout", LocalDate.now().plusDays(7).toString());

        List<Map<String, Object>> paymentsList = txList.stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", String.valueOf(t.getId()));
            m.put("date", t.getCreatedAt().toString());
            m.put("reference", t.getTransactionId() != null ? t.getTransactionId() : ("TRX-" + t.getId()));
            
            String mappedType = "VERSEMEMENT_RECU";
            if ("WITHDRAWAL".equalsIgnoreCase(t.getType())) {
                mappedType = "RETRAIT_DEMANDE";
            } else if ("RECHARGE".equalsIgnoreCase(t.getType())) {
                mappedType = "AJUSTEMENT";
            }
            m.put("type", mappedType);
            m.put("amount", t.getAmount());
            m.put("method", "Wallet");
            m.put("status", t.getStatus() != null ? t.getStatus().toUpperCase() : "PAID");
            m.put("note", t.getTitle());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalPaid", totalPaid);
        response.put("pendingPayments", pendingPayments);
        response.put("failedPayments", failedPayments);
        response.put("summary", summary);
        response.put("payments", paymentsList);
        response.put("transactions", paymentsList);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/payments/withdraw")
    public ResponseEntity<?> requestWithdrawal(Authentication authentication, @RequestBody Map<String, Object> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        double amount = Double.parseDouble(payload.get("amount").toString());
        String method = payload.get("method").toString();
        String note = payload.getOrDefault("note", "").toString();

        com.pfeproject.GoRide.entities.UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getWalletBalance() == null || user.getWalletBalance() < amount) {
            return ResponseEntity.badRequest().body(new com.pfeproject.GoRide.dto.MessageResponse("Solde insuffisant"));
        }

        user.setWalletBalance(user.getWalletBalance() - amount);
        userRepository.save(user);

        com.pfeproject.GoRide.entities.Transaction tx = com.pfeproject.GoRide.entities.Transaction.builder()
                .title(note.isEmpty() ? "Retrait via " + method : note)
                .type("WITHDRAWAL")
                .amount(amount)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .transactionId("TRX-" + System.currentTimeMillis())
                .user(user)
                .build();
        transactionRepository.save(tx);

        Map<String, Object> res = new HashMap<>();
        res.put("id", String.valueOf(tx.getId()));
        res.put("date", tx.getCreatedAt().toString());
        res.put("reference", tx.getTransactionId());
        res.put("type", "RETRAIT_DEMANDE");
        res.put("amount", tx.getAmount());
        res.put("method", method);
        res.put("status", "PENDING");
        res.put("note", tx.getTitle());

        return ResponseEntity.ok(res);
    }

    @GetMapping("/history")
    public ResponseEntity<?> getDriverHistory(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<RideRequest> driverRides = rideRequestRepository.findByDriverIdOrderByCreatedAtDesc(userId);

        List<Map<String, Object>> itemsList = driverRides.stream().map(r -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", "h-" + r.getId());
            
            String type = "TRIP_COMPLETED";
            String title = "Trajet terminé";
            String status = "COMPLETED";
            String icon = "ion-md-car";
            
            if ("CANCELLED".equalsIgnoreCase(r.getStatus()) || "REJECTED".equalsIgnoreCase(r.getStatus())) {
                type = "TRIP_CANCELLED";
                title = "Trajet annulé";
                status = "CANCELLED";
                icon = "ion-md-close-circle";
            }
            
            item.put("type", type);
            item.put("title", title);
            item.put("description", "Course " + r.getDeparture() + " → " + r.getDestination() + " avec " + 
                     (r.getClient() != null ? (r.getClient().getFirstName() + " " + r.getClient().getLastName()) : "Passager GoRide"));
            item.put("amount", r.getEstimatedPrice());
            item.put("status", status);
            item.put("date", r.getCreatedAt().toString());
            item.put("icon", icon);
            
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("departure", r.getDeparture());
            metadata.put("arrival", r.getDestination());
            metadata.put("passenger", r.getClient() != null ? (r.getClient().getFirstName() + " " + r.getClient().getLastName()) : "Passager GoRide");
            metadata.put("distance", "N/A");
            metadata.put("duration", "N/A");
            item.put("metadata", metadata);
            
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("items", itemsList);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> getDriverConversations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<com.pfeproject.GoRide.entities.Conversation> conversations = conversationRepository.findAllByUserId(userId);

        List<Map<String, Object>> result = conversations.stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", String.valueOf(c.getId()));
            
            String convContext = c.getContext() != null ? c.getContext() : "";
            String type = "PASSENGER";
            if (c.getVehicle() != null) {
                type = "OWNER";
            }

            com.pfeproject.GoRide.entities.UserEntity other = c.getOwner().getId().equals(userId) ? c.getClient() : c.getOwner();
            m.put("type", type);

            m.put("participantName", other.getFirstName() + " " + other.getLastName());
            m.put("participantRole", c.getVehicle() != null ? "Propriétaire" : "Passager");
            m.put("avatar", other.getPhotoUrl() != null ? other.getPhotoUrl() : "assets/images/default-avatar.png");
            m.put("participantId", other.getId());

            if ("RIDE_REQUEST".equalsIgnoreCase(convContext) || "RIDE".equalsIgnoreCase(convContext)) {
                m.put("relatedEntityId", c.getBookingId() != null ? String.valueOf(c.getBookingId()) : "");
                m.put("relatedEntityType", "REQUEST");
                m.put("relatedTitle", c.getBookingId() != null ? ("Course #" + c.getBookingId()) : "Course GoRide");
            } else if (c.getVehicle() != null) {
                m.put("relatedEntityId", String.valueOf(c.getVehicle().getId()));
                m.put("relatedEntityType", "VEHICLE");
                m.put("relatedTitle", c.getVehicle().getBrand() + " " + c.getVehicle().getModel());
            } else {
                m.put("relatedEntityId", "");
                m.put("relatedEntityType", "TRIP");
                m.put("relatedTitle", "Trajet GoRide");
            }

            com.pfeproject.GoRide.entities.Message lastMsg = messageRepository.findFirstByConversationIdOrderByTimestampDesc(c.getId());
            m.put("lastMessage", lastMsg != null ? lastMsg.getContent() : "");
            m.put("lastMessageTime", lastMsg != null ? lastMsg.getTimestamp().toString() : c.getCreatedAt().toString());
            m.put("unreadCount", messageRepository.countUnreadMessages(c.getId(), userId));
            m.put("status", "ACTIVE");

            List<com.pfeproject.GoRide.entities.Message> messages = messageRepository.findByConversationIdOrderByTimestampAsc(c.getId());
            List<Map<String, Object>> msgsMapped = messages.stream().map(msg -> {
                Map<String, Object> msgMap = new HashMap<>();
                msgMap.put("id", String.valueOf(msg.getId()));
                msgMap.put("sender", msg.getSender().getId().equals(userId) ? "DRIVER" : "PARTICIPANT");
                msgMap.put("senderName", msg.getSender().getFirstName() + " " + msg.getSender().getLastName());
                msgMap.put("content", msg.getContent());
                msgMap.put("timestamp", msg.getTimestamp().toString());
                msgMap.put("read", msg.getIsRead() != null ? msg.getIsRead() : true);
                msgMap.put("type", "text");
                return msgMap;
            }).collect(Collectors.toList());

            m.put("messages", msgsMapped);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getDriverNotifications(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<com.pfeproject.GoRide.entities.Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Map<String, Object>> result = notifications.stream().map(n -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", String.valueOf(n.getId()));
            m.put("type", n.getType() != null ? n.getType() : "GENERAL");
            m.put("title", n.getTitle());
            m.put("message", n.getMessage());
            m.put("date", n.getCreatedAt().toString());
            m.put("read", n.getIsRead() != null ? n.getIsRead() : false);
            m.put("important", "DANGER".equalsIgnoreCase(n.getType()) || "WARNING".equalsIgnoreCase(n.getType()));
            String targetUrl = n.getTargetUrl() != null ? n.getTargetUrl() : "";
            m.put("actionUrl", targetUrl);
            String relatedId = extractQueryParam(targetUrl, "rideId");
            if (relatedId == null) relatedId = extractQueryParam(targetUrl, "requestId");
            if (relatedId != null) {
                m.put("relatedEntityId", relatedId);
                m.put("relatedEntityType", "REQUEST");
            }
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/reviews")
    public ResponseEntity<?> getDriverReviews(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        List<com.pfeproject.GoRide.entities.Review> dbReviews =
                reviewRepository.findByDriver_IdOrderByCreatedAtDesc(userId);

        double totalRating = 0;
        for (com.pfeproject.GoRide.entities.Review r : dbReviews) {
            int chauffeurNote = r.getOwnerRating() != null ? r.getOwnerRating()
                    : (r.getVehicleRating() != null ? r.getVehicleRating() : 5);
            totalRating += chauffeurNote;
        }

        double averageRating = dbReviews.size() > 0 ? (totalRating / dbReviews.size()) : 0.0;

        List<Map<String, Object>> list = dbReviews.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", "r-" + r.getId());
            m.put("reviewerType", "PASSENGER");
            m.put("reviewerName", r.getClient().getFirstName() + " " + r.getClient().getLastName());
            String reviewerPhoto = resolveReviewerPhotoUrl(r.getClient());
            m.put("avatar", reviewerPhoto);
            m.put("photoUrl", reviewerPhoto);
            int chauffeurNote = r.getOwnerRating() != null ? r.getOwnerRating()
                    : (r.getVehicleRating() != null ? r.getVehicleRating() : 5);
            m.put("rating", chauffeurNote);
            m.put("comment", r.getComment());
            m.put("date", r.getCreatedAt().toString());
            m.put("relatedEntityType", "RENTAL");
            m.put("relatedTitle", r.getVehicle() != null
                    ? ("Location — " + r.getVehicle().getBrand() + " " + r.getVehicle().getModel())
                    : "Location GoRide");
            m.put("status", "PUBLISHED");
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("averageRating", averageRating);
        response.put("totalReviews", dbReviews.size());
        response.put("reviews", list);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/sidebar-counts")
    public ResponseEntity<?> getDriverSidebarCounts(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        // All unassigned passenger requests waiting for any driver
        long pendingRequests = rideRequestRepository.findByStatusOrderByCreatedAtDesc("PENDING").size();

        List<com.pfeproject.GoRide.entities.Conversation> conversations = conversationRepository.findAllByUserId(userId);
        long unreadConversations = 0;
        for (com.pfeproject.GoRide.entities.Conversation c : conversations) {
            unreadConversations += messageRepository.countUnreadMessages(c.getId(), userId);
        }

        long unreadNotifications = notificationRepository.countByUserIdAndIsReadFalse(userId);

        long reviewsCount = reviewRepository.findByDriver_IdOrderByCreatedAtDesc(userId).size();

        Map<String, Object> response = new HashMap<>();
        response.put("pendingRequests", pendingRequests);
        response.put("conversations", unreadConversations);
        response.put("unreadNotifications", unreadNotifications);
        response.put("reviews", reviewsCount);

        return ResponseEntity.ok(response);
    }

    private static String resolveReviewerPhotoUrl(com.pfeproject.GoRide.entities.UserEntity user) {
        if (user == null) {
            return null;
        }
        String url = user.getPhotoUrl();
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.contains("default-avatar") || trimmed.startsWith("assets/")) {
            return null;
        }
        return trimmed;
    }

    private static String extractQueryParam(String url, String param) {
        if (url == null || url.isBlank() || !url.contains(param + "=")) {
            return null;
        }
        int q = url.indexOf('?');
        String query = q >= 0 ? url.substring(q + 1) : url;
        for (String part : query.split("&")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2 && param.equalsIgnoreCase(kv[0].trim())) {
                return kv[1].trim();
            }
        }
        return null;
    }
}
