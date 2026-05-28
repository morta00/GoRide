package com.pfeproject.GoRide.config;

import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Données de démonstration pour soutenance — tarifs et lieux cohérents (Tunisie, TND).
 */
@Component
public class PresentationScenarioSeeder {

    static final String MARKER = "[GORIDE-PRESENTATION]";
    static final String OWNER_MARKER = "[GORIDE-OWNER-DEMO]";

    @Transactional
    public void seedIfNeeded(
            UserRepo userRepo,
            VehicleRepository vehicleRepository,
            TripRepository tripRepository,
            BookingRepository bookingRepository,
            RentalContractRepository rentalContractRepository,
            RideRequestRepository rideRequestRepository,
            CompanyServiceRequestRepository companyServiceRequestRepository,
            ActivityRepository activityRepository,
            ReviewRepository reviewRepository) {
        UserEntity owner = userRepo.findByEmail(DataSeeder.EMAIL_OWNER).orElse(null);
        UserEntity driver = userRepo.findByEmail(DataSeeder.EMAIL_DRIVER).orElse(null);
        UserEntity demoClient = userRepo.findByEmail(DataSeeder.EMAIL_CLIENT).orElse(null);
        UserEntity company = userRepo.findByEmail(DataSeeder.EMAIL_COMPANY).orElse(null);

        if (owner == null || driver == null || demoClient == null) {
            System.err.println("[PresentationSeeder] Comptes démo manquants.");
            return;
        }

        List<Vehicle> fleet = vehicleRepository.findByOwnerId(owner.getId());
        if (fleet.isEmpty()) {
            System.err.println("[PresentationSeeder] Aucun véhicule flotte — skip.");
            return;
        }

        purgePresentationRentals(rentalContractRepository, demoClient.getId());
        purgePresentationRideRequests(rideRequestRepository, demoClient.getId());

        int rentals = seedRentalContracts(rentalContractRepository, demoClient, owner, fleet);
        int rideReq = seedRideRequests(rideRequestRepository, demoClient, driver);
        int bookings = seedCovoiturageBookings(bookingRepository, tripRepository, demoClient, driver);

        int extraRentals = 0;
        int extraRides = 0;
        for (UserEntity user : userRepo.findAll()) {
            if (user.getId().equals(demoClient.getId())) {
                continue;
            }
            if (hasRole(user, ERole.ROLE_CLIENT)
                    && rentalContractRepository.findByRenterId(user.getId()).isEmpty()) {
                extraRentals += seedRentalContracts(rentalContractRepository, user, owner, fleet);
            }
            if (hasRole(user, ERole.ROLE_USER)
                    && rideRequestRepository.findByClientIdOrderByCreatedAtDesc(user.getId()).isEmpty()) {
                extraRides += seedRideRequests(rideRequestRepository, user, driver);
            }
        }

        int companyReq = 0;
        if (company != null) {
            purgePresentationCompanyRequests(companyServiceRequestRepository, company.getId());
            companyReq = seedCompanyRequests(companyServiceRequestRepository, company, owner, driver, fleet);
        }

        UserEntity client2 = userRepo.findByEmail(DataSeeder.EMAIL_CLIENT_2).orElse(demoClient);
        UserEntity client3 = userRepo.findByEmail(DataSeeder.EMAIL_CLIENT_3).orElse(demoClient);
        purgeOwnerPresentation(rentalContractRepository, reviewRepository, activityRepository, owner.getId());
        int ownerRentals = seedOwnerRevenueHistory(
                rentalContractRepository, owner, fleet, demoClient, client2, client3);
        ensureOwnerPaidRentalsForPresentation(rentalContractRepository, owner, fleet, demoClient, client2, client3);
        int ownerActivities = seedOwnerActivities(activityRepository, owner);
        int ownerReviews = seedOwnerReviews(reviewRepository, rentalContractRepository, owner, driver);

        long clientRentals = rentalContractRepository.findByRenterId(demoClient.getId()).size();
        long ownerCompleted = rentalContractRepository.findByOwnerId(owner.getId()).stream()
                .filter(r -> r.getStatus() == RentalStatus.COMPLETED).count();
        System.out.println("[PresentationSeeder] OK — démo client: " + rentals + " locations, " + rideReq
                + " trajets, " + bookings + " covoiturages | entreprise: " + companyReq);
        System.out.println("[PresentationSeeder] >>> Connexion soutenance LOCATAIRE: " + DataSeeder.EMAIL_CLIENT
                + " / " + DataSeeder.DEMO_PASSWORD_PLAIN + " (" + clientRentals + " réservations visibles)");
        System.out.println("[PresentationSeeder] >>> Connexion PROPRIÉTAIRE: " + DataSeeder.EMAIL_OWNER
                + " / " + DataSeeder.DEMO_PASSWORD_PLAIN + " — " + ownerRentals + " contrats démo, "
                + ownerCompleted + " terminés, " + ownerActivities + " activités, " + ownerReviews + " avis");
    }

    private void purgePresentationRentals(RentalContractRepository repo, Long renterId) {
        repo.findByRenterId(renterId).stream()
                .filter(r -> r.getClientNotes() != null && r.getClientNotes().contains(MARKER))
                .forEach(repo::delete);
    }

    private void purgePresentationRideRequests(RideRequestRepository repo, Long clientId) {
        repo.findByClientIdOrderByCreatedAtDesc(clientId).stream()
                .filter(r -> MARKER.equals(r.getComment()))
                .forEach(repo::delete);
    }

    private void purgePresentationCompanyRequests(CompanyServiceRequestRepository repo, Long companyId) {
        repo.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .filter(c -> MARKER.equals(c.getDescription()))
                .forEach(repo::delete);
    }

    private boolean hasRole(UserEntity user, ERole role) {
        if (user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream().anyMatch(r -> r.getName() == role);
    }

    /** Jours de location (même règle que RentalService). */
    private static long rentalDays(LocalDate start, LocalDate end) {
        long days = ChronoUnit.DAYS.between(start, end);
        return days <= 0 ? 1 : days;
    }

    private static double rentalTotal(Vehicle v, LocalDate start, LocalDate end) {
        double daily = v.getDailyPrice() != null ? v.getDailyPrice() : 70.0;
        return Math.round(daily * rentalDays(start, end));
    }

    /** Prise en charge dans une ville (évite l'affichage « Sfax → Sfax »). */
    private static String pickupAt(String city, String place) {
        return "Prise en charge — " + place + ", " + city;
    }

    private static String returnSameAgency(String city) {
        return "Restitution — même agence GoRide, " + city;
    }

    /** Location aller simple entre deux villes (rare mais réaliste). */
    private static String pickupIntercity(String cityA, String detailA) {
        return "Prise en charge — " + detailA + ", " + cityA;
    }

    private static String returnIntercity(String cityB, String detailB) {
        return "Restitution — " + detailB + ", " + cityB;
    }

    private int seedRideRequests(RideRequestRepository repo, UserEntity client, UserEntity driver) {
        LocalDateTime now = LocalDateTime.now();
        // departure, destination, type, passengers, payment, status, assignDriver, hoursAgo, price TND
        Object[][] scenarios = {
                {"Tunis (Lafayette)", "La Marsa (Corniche)", "INDIVIDUAL", 2, "Espèces", "PENDING", false, 2, 12.0},
                {"Ariana (Raoued)", "Tunis — Aéroport Carthage", "INDIVIDUAL", 3, "Carte bancaire", "PENDING", false, 5, 28.0},
                {"Sfax (Centre)", "Gabès (Médina)", "INDIVIDUAL", 1, "D17", "PENDING", false, 8, 62.0},
                {"Sousse (Kantaoui)", "Monastir (Aéroport Habib Bourguiba)", "INDIVIDUAL", 2, "Espèces", "ACCEPTED", true, 12, 24.0},
                {"Hammamet (Nord)", "Nabeul (Centre)", "INDIVIDUAL", 4, "Carte bancaire", "ACCEPTED", true, 20, 14.0},
                {"Tunis (Bab Bhar)", "Ariana (Mnihla)", "INDIVIDUAL", 1, "Espèces", "IN_PROGRESS", true, 1, 11.0},
                {"Bizerte (Port)", "Tunis (Lac 2)", "INDIVIDUAL", 2, "Espèces", "COMPLETED", true, 48, 48.0},
                {"Mahdia (Ville)", "Sousse (Médina)", "INDIVIDUAL", 2, "Carte bancaire", "COMPLETED", true, 72, 32.0},
                {"Nabeul (Marché)", "Hammamet (Yasmine)", "COLLABORATIVE", 3, "Espèces", "CANCELLED", false, 24, 10.0},
                {"Kairouan (Médina)", "Sfax (Centre-ville)", "INDIVIDUAL", 2, "D17", "REJECTED", true, 36, 55.0}
        };

        int added = 0;
        for (Object[] s : scenarios) {
            String dep = (String) s[0];
            String dest = (String) s[1];
            boolean exists = repo.findByClientIdOrderByCreatedAtDesc(client.getId()).stream()
                    .anyMatch(r -> MARKER.equals(r.getComment()) && dep.equals(r.getDeparture()));
            if (exists) continue;

            boolean assignDriver = (Boolean) s[6];
            String status = (String) s[5];
            LocalDateTime created = now.minusHours((Integer) s[7]);

            var b = RideRequest.builder()
                    .client(client)
                    .departure(dep)
                    .destination(dest)
                    .rideType((String) s[2])
                    .passengers((Integer) s[3])
                    .paymentMethod((String) s[4])
                    .status(status)
                    .estimatedPrice((Double) s[8])
                    .comment(MARKER)
                    .createdAt(created)
                    .updatedAt(created);

            if (assignDriver) {
                b.driver(driver);
                if ("ACCEPTED".equals(status) || "IN_PROGRESS".equals(status)) {
                    b.acceptedAt(created.plusMinutes(15));
                }
            }
            repo.save(b.build());
            added++;
        }
        return added;
    }

    private int seedRentalContracts(
            RentalContractRepository repo,
            UserEntity client,
            UserEntity owner,
            List<Vehicle> fleet) {
        LocalDate today = LocalDate.now();
        Vehicle peugeot208 = findVehicle(fleet, "DEMO-TU-001", "Peugeot", "Tunis");
        Vehicle clioSousse = findVehicle(fleet, "DEMO-SO-001", "Volkswagen", "Sousse");
        Vehicle symbolSfax = findVehicle(fleet, "DEMO-SF-001", "Renault", "Sfax");
        Vehicle sportageNabeul = findVehicle(fleet, "DEMO-NA-001", "Kia", "Nabeul");
        Vehicle poloSousse = findVehicle(fleet, "DEMO-SO-002", "Toyota", "Sousse");
        Vehicle loganSfax = findVehicle(fleet, "DEMO-SF-002", "Dacia", "Sfax");
        Vehicle classeCMonastir = findVehicle(fleet, "DEMO-MO-001", "Mercedes", "Monastir");

        // vehicle, startOff, endOff, status, payment, pickup, return, note
        Object[][] scenarios = {
                {peugeot208, 3, 5, RentalStatus.PENDING, "PENDING",
                        pickupAt("Tunis", "Lac 2 — Berges du Lac"), returnSameAgency("Tunis"),
                        "Week-end pro — 2 jours"},
                {symbolSfax, 5, 7, RentalStatus.PENDING, "PENDING",
                        pickupAt("Sfax", "Gare routière"), returnSameAgency("Sfax"),
                        "Mission courte — 2 jours"},
                {loganSfax, 8, 9, RentalStatus.PENDING, "PENDING",
                        pickupAt("Sfax", "Zone industrielle"), returnSameAgency("Sfax"),
                        "1 jour — déplacement local"},
                {clioSousse, 2, 5, RentalStatus.ACCEPTED, "PAID",
                        pickupAt("Sousse", "Port El Kantaoui"), returnSameAgency("Sousse"),
                        "Vacances — 3 jours"},
                {poloSousse, -5, -3, RentalStatus.COMPLETED, "PAID",
                        pickupAt("Sousse", "Médina"), returnSameAgency("Sousse"),
                        "Location terminée — 2 jours"},
                {sportageNabeul, -1, 2, RentalStatus.ACTIVE, "PAID",
                        pickupAt("Nabeul", "Centre-ville"), returnSameAgency("Nabeul"),
                        "Circuit Cap Bon — 3 jours"},
                {peugeot208, 10, 12, RentalStatus.ACCEPTED, "PENDING",
                        pickupIntercity("Tunis", "Aéroport Tunis-Carthage"), returnIntercity("Sousse", "Port El Kantaoui"),
                        "Aller simple Tunis → Sousse — 2 jours"},
                {classeCMonastir, 4, 5, RentalStatus.REJECTED, "CANCELLED",
                        pickupAt("Monastir", "Aéroport Habib Bourguiba"), returnSameAgency("Monastir"),
                        "Refusée — 1 jour"},
                {peugeot208, 14, 15, RentalStatus.CANCELLED, "CANCELLED",
                        pickupAt("Tunis", "Avenue Habib Bourguiba"), returnSameAgency("Tunis"),
                        "Annulée — 1 jour"},
                {symbolSfax, 1, 3, RentalStatus.ACCEPTED, "PAID",
                        pickupAt("Sfax", "Aéroport Thyna"), returnSameAgency("Sfax"),
                        "Affaires — 2 jours"}
        };

        int added = 0;
        for (Object[] s : scenarios) {
            Vehicle v = (Vehicle) s[0];
            if (v == null) continue;

            LocalDate start = today.plusDays((Integer) s[1]);
            LocalDate end = today.plusDays((Integer) s[2]);
            RentalStatus status = (RentalStatus) s[3];
            String noteSuffix = (String) s[7];
            double total = rentalTotal(v, start, end);

            boolean exists = repo.findByRenterId(client.getId()).stream()
                    .anyMatch(r -> MARKER.equals(r.getClientNotes()) && v.getId().equals(r.getVehicle().getId())
                            && start.equals(r.getStartDate()));
            if (exists) continue;

            repo.save(RentalContract.builder()
                    .vehicle(v)
                    .renter(client)
                    .owner(owner)
                    .startDate(start)
                    .endDate(end)
                    .proposedPrice(total)
                    .finalPrice(status == RentalStatus.PENDING ? null : total)
                    .totalPrice(total)
                    .pickupLocation((String) s[5])
                    .returnLocation((String) s[6])
                    .paymentStatus((String) s[4])
                    .status(status)
                    .clientNotes(MARKER + " " + noteSuffix + " (" + rentalDays(start, end) + " j × "
                            + (v.getDailyPrice() != null ? v.getDailyPrice().intValue() : 70) + " DT/j)")
                    .createdAt(LocalDateTime.now().minusDays(Math.max(0, 10 - (Integer) s[1])))
                    .build());
            added++;
        }
        return added;
    }

    private int seedCovoiturageBookings(
            BookingRepository bookingRepo,
            TripRepository tripRepo,
            UserEntity client,
            UserEntity driver) {
        List<Trip> driverTrips = tripRepo.findByDriverId(driver.getId());
        if (driverTrips.isEmpty()) return 0;

        int added = 0;
        for (Trip trip : driverTrips) {
            if (!"PUBLISHED".equalsIgnoreCase(trip.getStatus())) continue;

            String route = trip.getDeparture() + "→" + trip.getDestination();
            String status = pickBookingStatus(route);

            boolean already = bookingRepo.findByPassengerId(client.getId()).stream()
                    .anyMatch(b -> b.getTrip() != null && trip.getId().equals(b.getTrip().getId()));
            if (already) continue;

            double perSeat = trip.getPricePerSeat() != null ? trip.getPricePerSeat() : 18.0;
            int seats = 1;
            bookingRepo.save(Booking.builder()
                    .trip(trip)
                    .passenger(client)
                    .seatsBooked(seats)
                    .totalPrice(perSeat * seats)
                    .status(status)
                    .createdAt(LocalDateTime.now().minusHours(added * 3L + 1))
                    .build());
            added++;
            if (added >= 10) break;
        }
        return added;
    }

    private String pickBookingStatus(String route) {
        if (route.contains("Monastir") || route.contains("Ariana")) return "CONFIRMED";
        if (route.contains("Tunis→Sousse") || route.contains("Tunis→Sfax")) return "PENDING_DRIVER";
        if (route.contains("Sousse→Tunis") || route.contains("Sfax→Tunis")) return "CONFIRMED";
        if (route.contains("Bizerte")) return "PENDING_DRIVER";
        return "CONFIRMED";
    }

    private int seedCompanyRequests(
            CompanyServiceRequestRepository repo,
            UserEntity company,
            UserEntity owner,
            UserEntity driver,
            List<Vehicle> fleet) {
        Vehicle suv = findVehicle(fleet, "DEMO-TU-004", "Toyota", "Tunis");
        Vehicle transit = findVehicle(fleet, "DEMO-TU-003", "Ford", "Tunis");
        Vehicle bmw = findVehicle(fleet, "DEMO-SO-003", "BMW", "Sousse");
        LocalDate today = LocalDate.now();

        LocalDate tunisStart = today.plusDays(4);
        LocalDate tunisEnd = today.plusDays(6);
        long tunisDays = rentalDays(tunisStart, tunisEnd);
        double suvDaily = suv != null && suv.getDailyPrice() != null ? suv.getDailyPrice() : 175;

        LocalDate sfaxStart = today.plusDays(2);
        LocalDate sfaxEnd = today.plusDays(4);
        long sfaxDays = rentalDays(sfaxStart, sfaxEnd);
        double bmwDaily = bmw != null && bmw.getDailyPrice() != null ? bmw.getDailyPrice() : 280;

        Object[][] scenarios = {
                {"VEHICLE_RENTAL", "OWNER", suv, "PENDING_OWNER", "TRANSFER_AEROPORT",
                        tunisStart, tunisEnd, "Tunis", suvDaily * tunisDays, 1, 0,
                        "Navette équipe — aéroport Tunis-Carthage (3 j)."},
                {"VEHICLE_RENTAL", "OWNER", transit, "PENDING_OWNER", "EVENEMENT",
                        today.plusDays(10), today.plusDays(11), "Sousse",
                        (transit != null ? transit.getDailyPrice() : 120) * 1, 1, 0,
                        "Salon — 1 jour à Sousse."},
                {"VEHICLE_RENTAL", "OWNER", bmw, "ACCEPTED", "DEPLACEMENT_PRO",
                        sfaxStart, sfaxEnd, "Sfax", bmwDaily * sfaxDays, 1, 0,
                        "Déplacements filiale Sfax — 2 j."},
                {"DRIVER_WITH_CAR", "DRIVER", null, "PENDING_DRIVER", "MISE_A_DISPOSITION",
                        today.plusDays(1), today.plusDays(1), "Ariana", 95.0, 0, 1,
                        "Chauffeur + voiture — 1 journée Charguia."},
                {"DRIVER_WITH_CAR", "DRIVER", null, "CONFIRMED", "TRANSFER_AEROPORT",
                        today.plusDays(6), today.plusDays(6), "Tunis", 120.0, 0, 1,
                        "Transfert délégation aéroport."},
                {"CUSTOM_REQUEST", "OWNER", null, "PENDING_OWNER", "AUTRE",
                        today.plusDays(14), today.plusDays(17), "Monastir",
                        (suvDaily * 3 * 3) + (95.0 * 3), 3, 2,
                        "Flotte été — 3 véhicules × 3 j + 2 chauffeurs."}
        };

        int added = 0;
        String companyName = company.getFirstName() + " " + company.getLastName();
        for (Object[] s : scenarios) {
            String type = (String) s[0];
            Vehicle v = (Vehicle) s[2];
            String comment = (String) s[11];
            boolean exists = repo.findByCompanyIdOrderByCreatedAtDesc(company.getId()).stream()
                    .anyMatch(c -> MARKER.equals(c.getDescription()) && comment.equals(c.getComment()));
            if (exists) continue;

            var b = CompanyServiceRequest.builder()
                    .type(type)
                    .targetRole((String) s[1])
                    .companyId(company.getId())
                    .companyName(companyName)
                    .status((String) s[3])
                    .missionType((String) s[4])
                    .startDate((LocalDate) s[5])
                    .endDate((LocalDate) s[6])
                    .city((String) s[7])
                    .budget((Double) s[8])
                    .vehiclesCount((Integer) s[9])
                    .driversCount((Integer) s[10])
                    .comment(comment)
                    .description(MARKER)
                    .contactPerson("M. Karim Trabelsi — RH Mobilité")
                    .needType((String) s[4])
                    .createdAt(LocalDateTime.now().minusDays(added + 1L));

            if (v != null) {
                b.vehicleId(v.getId())
                        .vehicleName(v.getBrand() + " " + v.getModel())
                        .ownerName(owner.getFirstName() + " " + owner.getLastName())
                        .pricePerDay(v.getDailyPrice());
            }
            if ("DRIVER_WITH_CAR".equals(type) || "CUSTOM_REQUEST".equals(type)) {
                b.driverId(driver.getId())
                        .driverName(driver.getFirstName() + " " + driver.getLastName());
            }
            repo.save(b.build());
            added++;
        }
        return added;
    }

    private void purgeOwnerPresentation(
            RentalContractRepository rentalRepo,
            ReviewRepository reviewRepo,
            ActivityRepository activityRepo,
            Long ownerId) {
        rentalRepo.findByOwnerId(ownerId).stream()
                .filter(r -> r.getClientNotes() != null && r.getClientNotes().contains(OWNER_MARKER))
                .forEach(r -> {
                    reviewRepo.findByReservationId(r.getId()).ifPresent(reviewRepo::delete);
                    rentalRepo.delete(r);
                });
        activityRepo.findByUserIdOrderByCreatedAtDesc(ownerId).stream()
                .filter(a -> a.getDescription() != null && a.getDescription().contains(OWNER_MARKER))
                .forEach(activityRepo::delete);
    }

    /**
     * Historique propriétaire : locations terminées sur l'année (graphique revenus) + demandes en attente.
     */
    /**
     * Si la flotte MySQL n'a pas les plaques DEMO, on réutilise les véhicules existants du propriétaire.
     */
    private Vehicle fleetVehicle(List<Vehicle> fleet, String plate, String brandFallback, String cityFallback, int index) {
        Vehicle v = findVehicle(fleet, plate, brandFallback, cityFallback);
        if (v != null) {
            return v;
        }
        if (fleet.isEmpty()) {
            return null;
        }
        return fleet.get(Math.floorMod(index, fleet.size()));
    }

    /** Complète les locations client déjà acceptées/terminées avec un prix final pour la page Paiements. */
    private void ensureOwnerPaidRentalsForPresentation(
            RentalContractRepository repo,
            UserEntity owner,
            List<Vehicle> fleet,
            UserEntity... renters) {
        if (fleet.isEmpty()) {
            return;
        }
        UserEntity r0 = renters.length > 0 ? renters[0] : owner;
        UserEntity r1 = renters.length > 1 ? renters[1] : r0;
        LocalDate today = LocalDate.now();

        Object[][] paidBackfill = {
                {0, r0, -45, -43, "DEMO-SO-002", "Toyota", "Sousse"},
                {1, r1, -60, -57, "DEMO-SF-001", "Renault", "Sfax"},
                {2, r0, -90, -88, "DEMO-TU-001", "Peugeot", "Tunis"},
                {3, r1, -120, -117, "DEMO-NA-001", "Kia", "Nabeul"},
                {4, r0, -30, -28, "DEMO-SO-001", "Volkswagen", "Sousse"},
        };

        for (Object[] row : paidBackfill) {
            Vehicle v = fleetVehicle(fleet, (String) row[4], (String) row[5], (String) row[6], (Integer) row[0]);
            if (v == null) continue;

            LocalDate start = today.plusDays((Integer) row[2]);
            LocalDate end = today.plusDays((Integer) row[3]);
            double total = rentalTotal(v, start, end);
            UserEntity renter = (UserEntity) row[1];

            boolean exists = repo.findByOwnerId(owner.getId()).stream()
                    .anyMatch(r -> r.getClientNotes() != null && r.getClientNotes().contains("PAID-BACKFILL")
                            && v.getId().equals(r.getVehicle().getId()));
            if (exists) continue;

            repo.save(RentalContract.builder()
                    .vehicle(v)
                    .renter(renter)
                    .owner(owner)
                    .startDate(start)
                    .endDate(end)
                    .proposedPrice(total)
                    .finalPrice(total)
                    .totalPrice(total)
                    .pickupLocation(pickupAt((String) row[6], "Agence GoRide"))
                    .returnLocation(returnSameAgency((String) row[6]))
                    .paymentStatus("PAID")
                    .status(RentalStatus.COMPLETED)
                    .clientNotes(OWNER_MARKER + " PAID-BACKFILL — " + renter.getFirstName())
                    .createdAt(end.atTime(17, 0))
                    .build());
        }

        repo.findByOwnerId(owner.getId()).forEach(c -> {
            if (c.getStatus() == RentalStatus.PENDING && c.getProposedPrice() != null && c.getFinalPrice() == null) {
                c.setFinalPrice(c.getProposedPrice());
                repo.save(c);
            }
        });
    }

    private int seedOwnerRevenueHistory(
            RentalContractRepository repo,
            UserEntity owner,
            List<Vehicle> fleet,
            UserEntity... renters) {
        int year = LocalDate.now().getYear();
        UserEntity r0 = renters.length > 0 ? renters[0] : owner;
        UserEntity r1 = renters.length > 1 ? renters[1] : r0;
        UserEntity r2 = renters.length > 2 ? renters[2] : r0;

        Vehicle peugeot = fleetVehicle(fleet, "DEMO-TU-001", "Peugeot", "Tunis", 0);
        Vehicle clio = fleetVehicle(fleet, "DEMO-TU-002", "Renault", "Tunis", 1);
        Vehicle polo = fleetVehicle(fleet, "DEMO-SO-001", "Volkswagen", "Sousse", 2);
        Vehicle yaris = fleetVehicle(fleet, "DEMO-SO-002", "Toyota", "Sousse", 3);
        Vehicle symbol = fleetVehicle(fleet, "DEMO-SF-001", "Renault", "Sfax", 4);
        Vehicle logan = fleetVehicle(fleet, "DEMO-SF-002", "Dacia", "Sfax", 5);
        Vehicle sportage = fleetVehicle(fleet, "DEMO-NA-001", "Kia", "Nabeul", 6);
        Vehicle i20 = fleetVehicle(fleet, "DEMO-AR-001", "Hyundai", "Ariana", 7);
        Vehicle rav4 = fleetVehicle(fleet, "DEMO-TU-004", "Toyota", "Tunis", 8);
        Vehicle fiat500 = fleetVehicle(fleet, "DEMO-HA-001", "Fiat", "Hammamet", 9);

        // vehicle, renter, month(1-12), dayStart, dayEnd, status, city, place
        Object[][] scenarios = {
                {peugeot, r0, 1, 12, 14, RentalStatus.COMPLETED, "Tunis", "Lac 2"},
                {polo, r1, 2, 8, 10, RentalStatus.COMPLETED, "Sousse", "Port El Kantaoui"},
                {symbol, r2, 2, 20, 22, RentalStatus.COMPLETED, "Sfax", "Gare routière"},
                {yaris, r0, 3, 5, 8, RentalStatus.COMPLETED, "Sousse", "Médina"},
                {logan, r1, 3, 18, 19, RentalStatus.COMPLETED, "Sfax", "Zone industrielle"},
                {sportage, r2, 4, 10, 13, RentalStatus.COMPLETED, "Nabeul", "Centre-ville"},
                {clio, r0, 4, 22, 24, RentalStatus.COMPLETED, "Tunis", "Ariana Ville"},
                {i20, r1, 5, 2, 4, RentalStatus.COMPLETED, "Ariana", "Raoued"},
                {rav4, r2, 5, 12, 15, RentalStatus.COMPLETED, "Tunis", "Berges du Lac"},
                {fiat500, r0, 5, 20, 22, RentalStatus.COMPLETED, "Hammamet", "Yasmine"},
                {peugeot, r1, 4, 1, 2, RentalStatus.COMPLETED, "Tunis", "Bab Bhar"},
                {polo, r2, 3, 25, 27, RentalStatus.COMPLETED, "Sousse", "Stadium"},
                {peugeot, r0, 6, 8, 10, RentalStatus.PENDING, "Tunis", "Aéroport Tunis-Carthage"},
                {symbol, r1, 7, 3, 5, RentalStatus.PENDING, "Sfax", "Aéroport Thyna"},
                {clio, r2, 5, 25, 27, RentalStatus.ACCEPTED, "Tunis", "Centre-ville"},
                {logan, r0, 6, 1, 3, RentalStatus.ACCEPTED, "Sfax", "Centre-ville"},
        };

        int added = 0;
        for (Object[] s : scenarios) {
            Vehicle v = (Vehicle) s[0];
            if (v == null) continue;

            UserEntity renter = (UserEntity) s[1];
            int month = (Integer) s[2];
            LocalDate start = LocalDate.of(year, month, (Integer) s[3]);
            LocalDate end = LocalDate.of(year, month, (Integer) s[4]);
            if (!end.isAfter(start)) {
                end = start.plusDays(1);
            }
            RentalStatus status = (RentalStatus) s[5];
            String city = (String) s[6];
            String place = (String) s[7];
            double total = rentalTotal(v, start, end);

            boolean exists = repo.findByOwnerId(owner.getId()).stream()
                    .anyMatch(r -> r.getClientNotes() != null && r.getClientNotes().contains(OWNER_MARKER)
                            && v.getId().equals(r.getVehicle().getId())
                            && start.equals(r.getStartDate()));
            if (exists) continue;

            LocalDateTime createdAt = start.atTime(10, 30).minusDays(2);
            if (status == RentalStatus.COMPLETED) {
                createdAt = end.atTime(18, 0);
            }

            repo.save(RentalContract.builder()
                    .vehicle(v)
                    .renter(renter)
                    .owner(owner)
                    .startDate(start)
                    .endDate(end)
                    .proposedPrice(total)
                    .finalPrice(total)
                    .totalPrice(total)
                    .pickupLocation(pickupAt(city, place))
                    .returnLocation(returnSameAgency(city))
                    .paymentStatus(status == RentalStatus.COMPLETED ? "PAID"
                            : (status == RentalStatus.ACCEPTED ? "PAID" : "PENDING"))
                    .status(status)
                    .clientNotes(OWNER_MARKER + " — " + renter.getFirstName() + " " + renter.getLastName()
                            + " (" + rentalDays(start, end) + " j × "
                            + (v.getDailyPrice() != null ? v.getDailyPrice().intValue() : 70) + " DT/j)")
                    .createdAt(createdAt)
                    .build());
            added++;
        }
        return added;
    }

    private int seedOwnerActivities(ActivityRepository repo, UserEntity owner) {
        Object[][] rows = {
                {"Paiement reçu", "Location Peugeot 208 — Riadh Landolsi, 116 DT", "success", 1, 15},
                {"Réservation confirmée", "Volkswagen Polo — Amira Gharbi, 150 DT (3 jours)", "success", 2, 10},
                {"Nouvelle demande", "Dacia Logan — Karim Mansouri, en attente de validation", "info", 0, 5},
                {"Paiement reçu", "Kia Sportage — Karim Mansouri, 375 DT", "success", 4, 14},
                {"Véhicule restitué", "Toyota Yaris — Sousse, état conforme", "success", 3, 9},
                {"Maintenance planifiée", "Renault Symbol — révision 15 000 km (Sfax)", "warning", 5, 20},
                {"Message client", "Amira Gharbi — question sur extension de location", "info", 0, 2},
                {"Paiement reçu", "Toyota RAV4 — Karim Mansouri, 420 DT", "success", 5, 16},
        };

        int added = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Object[] row : rows) {
            String title = (String) row[0];
            String desc = (String) row[1] + " " + OWNER_MARKER;
            boolean exists = repo.findByUserIdOrderByCreatedAtDesc(owner.getId()).stream()
                    .anyMatch(a -> title.equals(a.getTitle()) && desc.equals(a.getDescription()));
            if (exists) continue;

            repo.save(Activity.builder()
                    .user(owner)
                    .title(title)
                    .description(desc)
                    .type("FLEET")
                    .category((String) row[2])
                    .createdAt(now.minusDays((Integer) row[3]).minusHours((Integer) row[4]))
                    .build());
            added++;
        }
        return added;
    }

    private int seedOwnerReviews(
            ReviewRepository reviewRepo,
            RentalContractRepository rentalRepo,
            UserEntity owner,
            UserEntity defaultDriver) {
        String[] comments = {
                "Véhicule propre, prise en charge rapide à Tunis. Je recommande.",
                "Excellent rapport qualité/prix pour un week-end à Sousse.",
                "Logan économique, parfait pour la zone industrielle de Sfax.",
                "SUV très confortable pour le circuit Cap Bon, merci Ahmed.",
                "Service professionnel, contrat clair et véhicule comme sur les photos."
        };
        int added = 0;
        int commentIdx = 0;
        List<RentalContract> completed = rentalRepo.findByOwnerId(owner.getId()).stream()
                .filter(r -> r.getStatus() == RentalStatus.COMPLETED)
                .filter(r -> r.getClientNotes() != null && r.getClientNotes().contains(OWNER_MARKER))
                .limit(5)
                .toList();

        for (RentalContract contract : completed) {
            if (reviewRepo.findByReservationId(contract.getId()).isPresent()) {
                continue;
            }
            Vehicle vehicle = contract.getVehicle();
            UserEntity driverRef = defaultDriver;
            if (vehicle != null && vehicle.getDriver() != null) {
                driverRef = vehicle.getDriver();
            }
            int rating = 4 + (commentIdx % 2);
            reviewRepo.save(Review.builder()
                    .reservation(contract)
                    .client(contract.getRenter())
                    .vehicle(vehicle)
                    .owner(owner)
                    .driver(driverRef)
                    .vehicleRating(rating)
                    .ownerRating(5)
                    .comment(comments[commentIdx % comments.length])
                    .createdAt(contract.getCreatedAt() != null
                            ? contract.getCreatedAt().plusHours(6)
                            : LocalDateTime.now())
                    .build());
            added++;
            commentIdx++;
        }
        return added;
    }

    private Vehicle findVehicle(List<Vehicle> fleet, String plate, String brandFallback, String cityFallback) {
        Optional<Vehicle> byPlate = fleet.stream()
                .filter(v -> plate.equals(v.getLicensePlate()))
                .findFirst();
        if (byPlate.isPresent()) return byPlate.get();
        return fleet.stream()
                .filter(v -> (brandFallback == null || (v.getBrand() != null && v.getBrand().contains(brandFallback)))
                        && (cityFallback == null || cityFallback.equalsIgnoreCase(v.getLocation())))
                .findFirst()
                .orElse(fleet.isEmpty() ? null : fleet.get(0));
    }
}
