package com.pfeproject.GoRide.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Ensures demo users, rentable vehicles (with real Tunisia coordinates), and published trips
 * so vehicle search and covoiturage always return results.
 */
@Configuration
public class DataSeeder {

    /** Comptes démo permanents (réinjectés à chaque démarrage si besoin). */
    public static final String DEMO_PASSWORD_PLAIN = "Demo1234!";
    public static final String EMAIL_OWNER = "owner@goride.demo";
    public static final String EMAIL_DRIVER = "driver@goride.demo";
    public static final String EMAIL_CLIENT = "client@goride.demo";
    public static final String EMAIL_COMPANY = "company@goride.demo";
    public static final String EMAIL_COMPANY_2 = "entreprise.tech@goride.demo";
    public static final String EMAIL_COMPANY_3 = "logistique.tunis@goride.demo";
    public static final String EMAIL_CLIENT_2 = "locataire2@goride.demo";
    public static final String EMAIL_CLIENT_3 = "locataire3@goride.demo";

    @Value("${goride.demo.seed-min-vehicles:12}")
    private int minRentableVehicles;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final PresentationScenarioSeeder presentationScenarioSeeder;
    private final AdminDemoSeeder adminDemoSeeder;

    public DataSeeder(PresentationScenarioSeeder presentationScenarioSeeder, AdminDemoSeeder adminDemoSeeder) {
        this.presentationScenarioSeeder = presentationScenarioSeeder;
        this.adminDemoSeeder = adminDemoSeeder;
    }

    @Bean
    @Order(100)
    CommandLineRunner seedDemoData(
            UserRepo userRepo,
            RoleRepository roleRepository,
            VehicleRepository vehicleRepository,
            TripRepository tripRepository,
            BookingRepository bookingRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            RentalContractRepository rentalContractRepository,
            RideRequestRepository rideRequestRepository,
            CompanyServiceRequestRepository companyServiceRequestRepository,
            TransactionRepository transactionRepository,
            NotificationRepository notificationRepository,
            ActivityRepository activityRepository,
            ReviewRepository reviewRepository,
            PlatformComplaintRepository platformComplaintRepository,
            SupportTicketRepository supportTicketRepository,
            PlatformReportRepository platformReportRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            ensureRoles(roleRepository);

            UserEntity owner = ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_OWNER, "Ahmed", "Abidi", Set.of(ERole.ROLE_FLEET_OWNER), true);
            UserEntity driver = ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_DRIVER, "Imed", "Kilani", Set.of(ERole.ROLE_DRIVER), false);
            UserEntity client = ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_CLIENT, "Riadh", "Landolsi", Set.of(ERole.ROLE_CLIENT, ERole.ROLE_USER), false);
            UserEntity company = ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_COMPANY, "Société", "GoRide", Set.of(ERole.ROLE_COMPANY, ERole.ROLE_USER), false);
            ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_COMPANY_2, "Tech", "Solutions SARL", Set.of(ERole.ROLE_COMPANY), false);
            ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_COMPANY_3, "Logistique", "Tunis SA", Set.of(ERole.ROLE_COMPANY), false);
            ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_CLIENT_2, "Amira", "Gharbi", Set.of(ERole.ROLE_CLIENT, ERole.ROLE_USER), false);
            ensureDemoUser(userRepo, roleRepository, passwordEncoder,
                    EMAIL_CLIENT_3, "Karim", "Mansouri", Set.of(ERole.ROLE_CLIENT, ERole.ROLE_USER), false);

            repairDemoFleetOwner(vehicleRepository, owner);

            Map<String, String> demoPhotos = loadDemoVehiclePhotos();

            long rentable = vehicleRepository.countByAvailableTrueAndStatus(VehicleStatus.AVAILABLE);
            if (rentable < minRentableVehicles) {
                seedDemoVehicles(owner, vehicleRepository, demoPhotos);
            }
            repairDemoVehicles(vehicleRepository, demoPhotos);
            assignDemoDriverToOwnerVehicles(vehicleRepository, owner, driver);

            long publishedTrips = tripRepository.countByStatus("PUBLISHED");
            if (publishedTrips < 5) {
                seedTrips(userRepo, roleRepository, vehicleRepository, tripRepository, passwordEncoder);
            }
            linkOrphanTripsToDemoDriver(tripRepository, driver);
            System.out.println("[DataSeeder] Chauffeur démo id=" + driver.getId() + " — les réservations covoiturage apparaissent sous " + EMAIL_DRIVER);
            seedDemoCovoiturageBookings(bookingRepository, tripRepository, client, driver);

            seedDemoRentalConversation(owner, client, vehicleRepository, conversationRepository, messageRepository);
            seedDemoCompanyConversations(company, owner, driver, vehicleRepository, conversationRepository, messageRepository);
            clearDemoStockProfilePhotos(userRepo);

            presentationScenarioSeeder.seedIfNeeded(
                    userRepo, vehicleRepository, tripRepository, bookingRepository,
                    rentalContractRepository, rideRequestRepository, companyServiceRequestRepository,
                    activityRepository, reviewRepository);

            adminDemoSeeder.seedIfNeeded(
                    userRepo, platformComplaintRepository, supportTicketRepository,
                    platformReportRepository, transactionRepository, notificationRepository,
                    vehicleRepository);
        };
    }

    /** Pas de photos stock : avatars (initiales) sauf photo uploadée par l'utilisateur dans Mon profil. */
    private void clearDemoStockProfilePhotos(UserRepo userRepo) {
        for (String email : List.of(EMAIL_CLIENT, EMAIL_DRIVER, EMAIL_OWNER, EMAIL_COMPANY)) {
            userRepo.findByEmail(email).ifPresent(u -> {
                String url = u.getPhotoUrl();
                if (url != null && (url.contains("unsplash.com") || url.contains("pravatar")
                        || url.contains("default-avatar") || url.startsWith("assets/"))) {
                    u.setPhotoUrl(null);
                    userRepo.save(u);
                }
            });
        }
    }

    /** Conversations entreprise ↔ propriétaire et chauffeur (page /company/conversations). */
    private void seedDemoCompanyConversations(
            UserEntity company,
            UserEntity owner,
            UserEntity driver,
            VehicleRepository vehicleRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository) {
        Vehicle vehicle = vehicleRepository.findByOwnerId(owner.getId()).stream().findFirst().orElse(null);

        Conversation withOwner = conversationRepository
                .findExistingConversation(owner.getId(), company.getId(), vehicle != null ? vehicle.getId() : null, null)
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .owner(owner)
                        .client(company)
                        .vehicle(vehicle)
                        .context("COMPANY_OWNER")
                        .createdAt(LocalDateTime.now())
                        .build()));

        if (messageRepository.findByConversationIdOrderByTimestampAsc(withOwner.getId()).isEmpty()) {
            messageRepository.save(Message.builder()
                    .conversation(withOwner)
                    .sender(owner)
                    .content("Bonjour, nous sommes disponibles pour vos demandes de flotte entreprise.")
                    .isRead(false)
                    .timestamp(LocalDateTime.now())
                    .build());
        }

        Conversation withDriver = conversationRepository
                .findExistingConversation(driver.getId(), company.getId(), null, null)
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .owner(driver)
                        .client(company)
                        .context("COMPANY_DRIVER")
                        .createdAt(LocalDateTime.now())
                        .build()));

        if (messageRepository.findByConversationIdOrderByTimestampAsc(withDriver.getId()).isEmpty()) {
            messageRepository.save(Message.builder()
                    .conversation(withDriver)
                    .sender(company)
                    .content("Bonjour, pouvez-vous confirmer votre disponibilité pour une mission demain ?")
                    .isRead(false)
                    .timestamp(LocalDateTime.now())
                    .build());
        }
        System.out.println("[DataSeeder] Conversations entreprise démo pour " + EMAIL_COMPANY);
    }

    /** Conversation location démo : message du locataire vers Ahmed Abidi (propriétaire). */
    private void seedDemoRentalConversation(
            UserEntity owner,
            UserEntity client,
            VehicleRepository vehicleRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository) {
        Vehicle vehicle = vehicleRepository.findByOwnerId(owner.getId()).stream()
                .findFirst()
                .orElse(null);
        if (vehicle == null) {
            return;
        }

        Conversation conv = conversationRepository
                .findExistingConversation(owner.getId(), client.getId(), vehicle.getId(), null)
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .owner(owner)
                        .client(client)
                        .vehicle(vehicle)
                        .context("RENTAL_CLIENT")
                        .createdAt(LocalDateTime.now())
                        .build()));

        boolean hasMessages = !messageRepository.findByConversationIdOrderByTimestampAsc(conv.getId()).isEmpty();
        if (!hasMessages) {
            messageRepository.save(Message.builder()
                    .conversation(conv)
                    .sender(client)
                    .content("Bonjour, je souhaite louer ce véhicule. Est-il disponible ?")
                    .isRead(false)
                    .timestamp(LocalDateTime.now())
                    .build());
            System.out.println("[DataSeeder] Demo rental message seeded for fleet owner inbox.");
        }
    }

    private Map<String, String> loadDemoVehiclePhotos() {
        try (InputStream in = getClass().getResourceAsStream("/vehicle-photos.json")) {
            if (in == null) {
                System.err.println("[DataSeeder] vehicle-photos.json not found on classpath");
                return Map.of();
            }
            return objectMapper.readValue(in, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            System.err.println("[DataSeeder] Failed to load vehicle-photos.json: " + e.getMessage());
            return Map.of();
        }
    }

    private String photoForPlate(Map<String, String> photos, String plate) {
        return photos.getOrDefault(plate,
                "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800");
    }

    private void ensureRoles(RoleRepository roleRepository) {
        for (ERole name : ERole.values()) {
            if (roleRepository.findByName(name).isEmpty()) {
                roleRepository.save(Role.builder().name(name).build());
            }
        }
    }

    private void repairDemoVehicles(VehicleRepository vehicleRepository, Map<String, String> demoPhotos) {
        vehicleRepository.findAll().stream()
                .filter(v -> v.getLicensePlate() != null && v.getLicensePlate().startsWith("DEMO-"))
                .forEach(v -> {
                    v.setAvailable(true);
                    v.setStatus(VehicleStatus.AVAILABLE);
                    String photo = photoForPlate(demoPhotos, v.getLicensePlate());
                    if (photo != null && !photo.equals(v.getPhotoUrl())) {
                        v.setPhotoUrl(photo);
                    }
                    vehicleRepository.save(v);
                });
    }

    private void seedDemoVehicles(UserEntity owner, VehicleRepository vehicleRepository,
                                  Map<String, String> demoPhotos) {
        DemoVehicle[] catalog = {
                v("DEMO-TU-001", "Peugeot", "208", "Tunis", 36.8065, 10.1815, "Économique", "Manuelle", "Essence", 58, 4.6),
                v("DEMO-TU-002", "Renault", "Clio V", "Tunis", 36.8180, 10.1650, "Compacte", "Automatique", "Essence", 72, 4.7),
                v("DEMO-AR-001", "Hyundai", "i20", "Ariana", 36.8665, 10.1647, "Économique", "Manuelle", "Essence", 55, 4.4),
                v("DEMO-SO-001", "Volkswagen", "Polo", "Sousse", 35.8256, 10.6084, "Compacte", "Automatique", "Essence", 75, 4.8),
                v("DEMO-SO-002", "Toyota", "Yaris", "Sousse", 35.8390, 10.6400, "Économique", "Automatique", "Hybride", 78, 4.9),
                v("DEMO-SF-001", "Renault", "Symbol", "Sfax", 34.7406, 10.7603, "Économique", "Manuelle", "Diesel", 62, 4.3),
                v("DEMO-SF-002", "Dacia", "Logan", "Sfax", 34.7200, 10.7500, "Compacte", "Manuelle", "Essence", 58, 4.2),
                v("DEMO-HA-001", "Fiat", "500", "Hammamet", 36.4000, 10.6167, "Compacte", "Automatique", "Essence", 85, 4.5),
                v("DEMO-BI-001", "Peugeot", "3008", "Bizerte", 37.2746, 9.8739, "SUV", "Automatique", "Diesel", 115, 4.7),
                v("DEMO-NA-001", "Kia", "Sportage", "Nabeul", 36.4513, 10.7357, "SUV", "Automatique", "Diesel", 125, 4.8),
                v("DEMO-MO-001", "Mercedes", "Classe C", "Monastir", 35.7643, 10.8113, "Luxe", "Automatique", "Essence", 220, 4.9),
                v("DEMO-TU-003", "Ford", "Transit", "Tunis", 36.7900, 10.2100, "Utilitaire", "Manuelle", "Diesel", 95, 4.1),
                v("DEMO-SO-003", "BMW", "Série 3", "Sousse", 35.8500, 10.6000, "Luxe", "Automatique", "Essence", 250, 5.0),
                v("DEMO-TU-004", "Toyota", "RAV4", "Tunis", 36.8300, 10.1900, "SUV", "Automatique", "Hybride", 140, 4.8)
        };

        int created = 0;
        for (DemoVehicle d : catalog) {
            if (vehicleRepository.existsByLicensePlate(d.plate)) {
                continue;
            }
            Vehicle vehicle = Vehicle.builder()
                    .brand(d.brand).model(d.model).licensePlate(d.plate)
                    .seats(d.category.equals("Utilitaire") ? 9 : 5)
                    .dailyPrice(d.price).depositAmount(d.price * 6)
                    .fuelType(d.fuel).transmission(d.transmission)
                    .location(d.city).latitude(d.lat).longitude(d.lng)
                    .category(d.category)
                    .description("Véhicule de démonstration GoRide — " + d.city + ", " + d.category + ".")
                    .status(VehicleStatus.AVAILABLE).available(true)
                    .rating(d.rating).year(2022).hasAC(true)
                    .owner(owner)
                    .photoUrl(photoForPlate(demoPhotos, d.plate))
                    .build();
            vehicleRepository.save(vehicle);
            created++;
        }
        System.out.println("[DataSeeder] " + created + " demo vehicles added (plates DEMO-*). Rentable total: "
                + vehicleRepository.countByAvailableTrueAndStatus(VehicleStatus.AVAILABLE));
    }

    private void seedTrips(UserRepo userRepo, RoleRepository roleRepository,
                           VehicleRepository vehicleRepository, TripRepository tripRepository,
                           PasswordEncoder encoder) {
        UserEntity driver = ensureDemoUser(userRepo, roleRepository, encoder,
                EMAIL_DRIVER, "Imed", "Kilani", Set.of(ERole.ROLE_DRIVER), false);
        Vehicle vehicle = vehicleRepository.findAll().stream().findFirst().orElse(null);

        LocalDateTime base = LocalDateTime.now().plusDays(1).withHour(8).withMinute(0).withSecond(0).withNano(0);

        Object[][] routes = {
                {"Tunis (Centre)", "Sousse (Kantaoui)", 16.0, 3, 0},
                {"Tunis (Lafayette)", "Sfax (Centre)", 23.0, 3, 1},
                {"Sousse (Médina)", "Tunis (Lac 2)", 16.0, 2, 2},
                {"Sfax (Aéroport Thyna)", "Tunis (Bab Bhar)", 21.0, 4, 3},
                {"Tunis (Lac 2)", "Bizerte (Port)", 14.0, 3, 4},
                {"Ariana (Mnihla)", "Hammamet (Nord)", 11.0, 2, 5},
                {"Monastir (Aéroport)", "Sousse (Kantaoui)", 9.0, 4, 6}
        };

        int added = 0;
        for (Object[] r : routes) {
            String dep = (String) r[0];
            String dest = (String) r[1];
            double price = (double) r[2];
            int seats = (int) r[3];
            int dayOffset = (int) r[4];

            boolean exists = tripRepository.findAll().stream()
                    .anyMatch(t -> dep.equalsIgnoreCase(t.getDeparture())
                            && dest.equalsIgnoreCase(t.getDestination())
                            && "PUBLISHED".equals(t.getStatus()));
            if (exists) continue;

            tripRepository.save(Trip.builder()
                    .departure(dep).destination(dest)
                    .departureTime(base.plusDays(dayOffset))
                    .availableSeats(seats).pricePerSeat(price)
                    .status("PUBLISHED")
                    .notes("Trajet démo GoRide — " + dep + " → " + dest)
                    .driver(driver).vehicle(vehicle)
                    .build());
            added++;
        }
        System.out.println("[DataSeeder] " + added + " demo trips added (PUBLISHED).");
    }

    /**
     * Réservations covoiturage démo (client → trajets du chauffeur) pour tester « Demandes reçues ».
     */
    private void seedDemoCovoiturageBookings(
            BookingRepository bookingRepository,
            TripRepository tripRepository,
            UserEntity client,
            UserEntity driver) {
        if (client == null || driver == null) return;
        int added = 0;
        for (Trip trip : tripRepository.findByDriverId(driver.getId())) {
            String route = trip.getDeparture() + "->" + trip.getDestination();
            if (!route.contains("Monastir") && !route.contains("Ariana") && !route.contains("Hammamet")) {
                continue;
            }
            boolean hasBooking = bookingRepository.existsByTripIdAndPassengerIdAndStatus(
                    trip.getId(), client.getId(), "CONFIRMED")
                    || bookingRepository.existsByTripIdAndPassengerIdAndStatus(
                    trip.getId(), client.getId(), "PENDING_DRIVER");
            if (hasBooking) continue;

            double price = trip.getPricePerSeat() != null ? trip.getPricePerSeat() : 10.0;
            String status = "Monastir".equalsIgnoreCase(trip.getDeparture()) ? "CONFIRMED" : "PENDING_DRIVER";
            bookingRepository.save(Booking.builder()
                    .trip(trip)
                    .passenger(client)
                    .seatsBooked(1)
                    .totalPrice(price)
                    .status(status)
                    .build());
            added++;
        }
        if (added > 0) {
            System.out.println("[DataSeeder] " + added + " réservation(s) covoiturage démo (client → chauffeur).");
        }
    }

    /** Assigne le chauffeur démo aux véhicules du propriétaire pour que les avis clients apparaissent côté chauffeur. */
    private void assignDemoDriverToOwnerVehicles(
            VehicleRepository vehicleRepository, UserEntity owner, UserEntity driver) {
        vehicleRepository.findByOwnerId(owner.getId()).stream()
                .filter(v -> v.getDriver() == null)
                .limit(8)
                .forEach(v -> {
                    v.setDriver(driver);
                    vehicleRepository.save(v);
                });
    }

    /** Trajets sans chauffeur → Imed Kilani (driver@goride.demo) pour que l'inbox chauffeur fonctionne. */
    private void linkOrphanTripsToDemoDriver(TripRepository tripRepository, UserEntity driver) {
        int fixed = 0;
        for (Trip t : tripRepository.findAll()) {
            if (t.getDriver() == null) {
                t.setDriver(driver);
                tripRepository.save(t);
                fixed++;
            }
        }
        if (fixed > 0) {
            System.out.println("[DataSeeder] " + fixed + " trajet(s) relié(s) au chauffeur démo.");
        }
    }

    /**
     * Crée ou met à jour un compte démo (nom, rôles, mot de passe, profil) à chaque démarrage.
     */
    private UserEntity ensureDemoUser(UserRepo userRepo, RoleRepository roleRepository,
                                      PasswordEncoder encoder, String email,
                                      String firstName, String lastName, Set<ERole> roleNames,
                                      boolean fleetOwnerProfile) {
        Set<Role> roles = new HashSet<>();
        for (ERole rn : roleNames) {
            roleRepository.findByName(rn).ifPresent(roles::add);
        }

        UserEntity user = userRepo.findByEmail(email).orElseGet(() -> UserEntity.builder()
                .email(email)
                .password(encoder.encode(DEMO_PASSWORD_PLAIN))
                .roles(new HashSet<>(roles))
                .build());

        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEnabled(true);
        user.setVerificationStatus("VERIFIED");
        user.setRoles(roles);
        if (!encoder.matches(DEMO_PASSWORD_PLAIN, user.getPassword())) {
            user.setPassword(encoder.encode(DEMO_PASSWORD_PLAIN));
        }

        if (fleetOwnerProfile) {
            user.setHasFleet(true);
            user.setCity(user.getCity() != null && !user.getCity().isBlank() ? user.getCity() : "Tunis");
            user.setPhone(user.getPhone() != null && !user.getPhone().isBlank() ? user.getPhone() : "+216 20 123 456");
            user.setAddress(user.getAddress() != null && !user.getAddress().isBlank()
                    ? user.getAddress() : "Avenue Habib Bourguiba, Tunis");
            user.setCountry(user.getCountry() != null && !user.getCountry().isBlank() ? user.getCountry() : "Tunisie");
        } else if (roleNames.contains(ERole.ROLE_COMPANY)) {
            if (EMAIL_COMPANY_2.equalsIgnoreCase(email)) {
                user.setCity("Ariana");
                user.setPhone("+216 71 111 222");
                user.setAddress("Zone industrielle Charguia, Ariana");
            } else if (EMAIL_COMPANY_3.equalsIgnoreCase(email)) {
                user.setCity("Sfax");
                user.setPhone("+216 74 333 444");
                user.setAddress("Route de Tunis km 3, Sfax");
            } else {
                user.setCity(user.getCity() != null && !user.getCity().isBlank() ? user.getCity() : "Tunis");
                user.setPhone(user.getPhone() != null && !user.getPhone().isBlank() ? user.getPhone() : "+216 71 000 000");
                user.setAddress(user.getAddress() != null && !user.getAddress().isBlank()
                        ? user.getAddress() : "Centre Urbain Nord, Tunis");
            }
            user.setCountry(user.getCountry() != null && !user.getCountry().isBlank() ? user.getCountry() : "Tunisie");
        }

        UserEntity saved = userRepo.save(user);
        System.out.println("[DataSeeder] Demo user OK: " + email + " → " + firstName + " " + lastName);
        return saved;
    }

    /** Tous les véhicules DEMO-* appartiennent au propriétaire Ahmed Abidi. */
    private void repairDemoFleetOwner(VehicleRepository vehicleRepository, UserEntity owner) {
        vehicleRepository.findAll().stream()
                .filter(v -> v.getLicensePlate() != null && v.getLicensePlate().startsWith("DEMO-"))
                .forEach(v -> {
                    if (v.getOwner() == null || !EMAIL_OWNER.equals(v.getOwner().getEmail())) {
                        v.setOwner(owner);
                        vehicleRepository.save(v);
                    }
                });
    }

    private static DemoVehicle v(String plate, String brand, String model, String city,
                                 double lat, double lng, String category, String transmission,
                                 String fuel, double price, double rating) {
        return new DemoVehicle(plate, brand, model, city, lat, lng, category, transmission, fuel, price, rating);
    }

    private record DemoVehicle(String plate, String brand, String model, String city,
                               double lat, double lng, String category, String transmission,
                               String fuel, double price, double rating) {}
}
