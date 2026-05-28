package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.ReviewDTO;
import com.pfeproject.GoRide.entities.RentalContract;
import com.pfeproject.GoRide.entities.RentalStatus;
import com.pfeproject.GoRide.entities.Review;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.entities.PlatformFeedback;
import com.pfeproject.GoRide.repositories.PlatformFeedbackRepository;
import com.pfeproject.GoRide.repositories.ReviewRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private RentalContractRepository reservationRepository;

    @Autowired
    private UserRepo userRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private PlatformFeedbackRepository platformFeedbackRepository;

    /** Après DataSeeder : location démo + avis lié au chauffeur assigné. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializeReviewDemoData() {
        Optional<UserEntity> driverOpt = userRepository.findByEmail("driver@goride.demo");
        userRepository.findByEmail("client@goride.demo").ifPresent(renter -> {
            driverOpt.ifPresent(this::ensureDemoDriverOnFleetVehicles);
            List<RentalContract> userReservations = reservationRepository.findByRenterId(renter.getId());
            boolean hasReviewable = userReservations.stream().anyMatch(this::isEligibleForReview);
            if (!hasReviewable) {
                findVehicleForDemoRental(renter, driverOpt.orElse(null)).ifPresent(vehicle -> {
                    RentalContract completed = RentalContract.builder()
                            .renter(renter)
                            .vehicle(vehicle)
                            .owner(vehicle.getOwner())
                            .startDate(LocalDate.now().minusDays(5))
                            .endDate(LocalDate.now().minusDays(2))
                            .status(RentalStatus.COMPLETED)
                            .finalPrice(350.0)
                            .totalPrice(350.0)
                            .paymentStatus("PAID")
                            .createdAt(LocalDateTime.now().minusDays(6))
                            .build();
                    reservationRepository.save(completed);
                });
            }
            backfillReviewDriverLinks();
            removeLegacyAutoSeededReviews();
            ensureReviewableRentalForClient(renter, driverOpt.orElse(null));
        });
    }

    /** Supprime l'ancien avis texte démo injecté automatiquement. */
    private void removeLegacyAutoSeededReviews() {
        final String legacyComment = "Excellent chauffeur, trajet fluide et véhicule impeccable. Merci GoRide !";
        reviewRepository.findAll().stream()
                .filter(r -> legacyComment.equals(r.getComment()))
                .forEach(reviewRepository::delete);
    }

    private void ensureDemoDriverOnFleetVehicles(UserEntity driver) {
        vehicleRepository.findAll().stream()
                .filter(v -> v.getOwner() != null && v.getDriver() == null)
                .limit(8)
                .forEach(v -> {
                    v.setDriver(driver);
                    vehicleRepository.save(v);
                });
    }

    private Optional<Vehicle> findVehicleForDemoRental(UserEntity renter, UserEntity driver) {
        return vehicleRepository.findAll().stream()
                .filter(v -> v.getOwner() != null && !v.getOwner().getId().equals(renter.getId()))
                .filter(v -> driver == null || v.getDriver() == null || v.getDriver().getId().equals(driver.getId()))
                .findFirst()
                .map(v -> {
                    if (driver != null && v.getDriver() == null) {
                        v.setDriver(driver);
                        vehicleRepository.save(v);
                    }
                    return v;
                });
    }

    private void backfillReviewDriverLinks() {
        reviewRepository.findAll().forEach(r -> {
            if (r.getDriver() != null) {
                return;
            }
            Vehicle v = r.getVehicle();
            if (v != null && v.getDriver() != null) {
                r.setDriver(v.getDriver());
                reviewRepository.save(r);
            }
        });
    }

    /** Garde au moins une location terminée sans avis pour tester « Laisser un avis » → chauffeur. */
    private void ensureReviewableRentalForClient(UserEntity client, UserEntity driver) {
        List<RentalContract> contracts = reservationRepository.findByRenterId(client.getId());
        boolean hasReviewable = contracts.stream().anyMatch(this::isEligibleForReview);
        if (hasReviewable) {
            return;
        }
        findVehicleForDemoRental(client, driver).ifPresent(vehicle -> {
            if (driver != null && vehicle.getDriver() == null) {
                vehicle.setDriver(driver);
                vehicleRepository.save(vehicle);
            }
            boolean alreadyHasRental = contracts.stream()
                    .anyMatch(c -> c.getVehicle() != null && c.getVehicle().getId().equals(vehicle.getId())
                            && c.getStatus() == RentalStatus.COMPLETED);
            if (!alreadyHasRental) {
                reservationRepository.save(RentalContract.builder()
                        .renter(client)
                        .vehicle(vehicle)
                        .owner(vehicle.getOwner())
                        .startDate(LocalDate.now().minusDays(3))
                        .endDate(LocalDate.now().minusDays(1))
                        .status(RentalStatus.COMPLETED)
                        .finalPrice(280.0)
                        .totalPrice(280.0)
                        .paymentStatus("PAID")
                        .createdAt(LocalDateTime.now().minusDays(4))
                        .build());
            }
        });
    }

    public List<ReviewDTO> getDriverReceivedReviews(Long driverId) {
        return reviewRepository.findByDriver_IdOrderByCreatedAtDesc(driverId).stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    private boolean isEligibleForReview(RentalContract c) {
        if (c == null || c.getStatus() == RentalStatus.CANCELLED || c.getStatus() == RentalStatus.REJECTED
                || c.getStatus() == RentalStatus.PENDING) {
            return false;
        }
        if (reviewRepository.findByReservationId(c.getId()).isPresent()) {
            return false;
        }
        if (c.getStatus() == RentalStatus.COMPLETED) {
            return true;
        }
        return rentalPeriodEnded(c) && (c.getStatus() == RentalStatus.ACCEPTED || c.getStatus() == RentalStatus.ACTIVE);
    }

    private boolean rentalPeriodEnded(RentalContract c) {
        return c.getEndDate() != null && !c.getEndDate().isAfter(LocalDate.now());
    }

    public ReviewDTO getReviewByReservation(Long reservationId) {
        return reviewRepository.findByReservationId(reservationId)
                .map(this::mapToDTO)
                .orElse(null);
    }

    @Transactional
    public ReviewDTO createReview(ReviewDTO dto, Long currentUserId) {
        RentalContract reservation = reservationRepository.findById(dto.getReservationId())
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));

        // Vérifications
        if (!reservation.getRenter().getId().equals(currentUserId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à laisser un avis pour cette réservation");
        }

        if (!isEligibleForReview(reservation)) {
            throw new RuntimeException("Vous ne pouvez laisser un avis que pour une location terminée (date de fin passée)");
        }

        if (reviewRepository.findByReservationId(dto.getReservationId()).isPresent()) {
            throw new RuntimeException("Un avis existe déjà pour cette réservation");
        }

        Vehicle vehicle = reservation.getVehicle();
        UserEntity assignedDriver = resolveDriverForReview(vehicle);

        Review review = Review.builder()
                .reservation(reservation)
                .client(reservation.getRenter())
                .vehicle(vehicle)
                .owner(reservation.getOwner())
                .driver(assignedDriver)
                .vehicleRating(dto.getVehicleRating())
                .ownerRating(dto.getOwnerRating())
                .comment(dto.getComment())
                .createdAt(LocalDateTime.now())
                .build();

        review = reviewRepository.save(review);
        return mapToDTO(review);
    }

    @Transactional
    public ReviewDTO updateReview(Long reviewId, ReviewDTO dto, Long currentUserId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Avis non trouvé"));

        if (!review.getClient().getId().equals(currentUserId)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à modifier cet avis");
        }

        review.setVehicleRating(dto.getVehicleRating());
        review.setOwnerRating(dto.getOwnerRating());
        review.setComment(dto.getComment());
        review.setUpdatedAt(LocalDateTime.now());

        review = reviewRepository.save(review);
        return mapToDTO(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewDTO> getSentReviews(Long clientId) {
        return reviewRepository.findByClientId(clientId).stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReviewDTO> getPendingReviews(Long clientId) {
        List<RentalContract> contracts = reservationRepository.findByRenterId(clientId);
        return contracts.stream()
                .filter(this::isEligibleForReview)
                .map(c -> ReviewDTO.builder()
                        .reservationId(c.getId())
                        .clientId(c.getRenter().getId())
                        .clientName(c.getRenter().getFirstName() + " " + c.getRenter().getLastName())
                        .vehicleId(c.getVehicle().getId())
                        .vehicleName(c.getVehicle().getBrand() + " " + c.getVehicle().getModel())
                        .ownerId(c.getOwner().getId())
                        .ownerName(displayChauffeurName(c.getVehicle()))
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public PlatformFeedback submitPlatformFeedback(Long clientId, Integer rating, String comment) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new RuntimeException("La note doit être entre 1 et 5");
        }
        if (comment == null || comment.trim().length() < 10) {
            throw new RuntimeException("Le commentaire doit contenir au moins 10 caractères");
        }
        UserEntity client = userRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        PlatformFeedback fb = PlatformFeedback.builder()
                .client(client)
                .rating(rating)
                .comment(comment.trim())
                .createdAt(LocalDateTime.now())
                .build();
        return platformFeedbackRepository.save(fb);
    }

    public List<PlatformFeedback> getPlatformFeedbacks(Long clientId) {
        return platformFeedbackRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    public List<ReviewDTO> getOwnerReviews(Long ownerId) {
        return reviewRepository.findByOwnerId(ownerId).stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    private UserEntity resolveDriverForReview(Vehicle vehicle) {
        if (vehicle == null) {
            return null;
        }
        if (vehicle.getDriver() != null) {
            return vehicle.getDriver();
        }
        if (vehicle.getOwner() != null) {
            Optional<UserEntity> fleetDriver = vehicleRepository.findByOwnerId(vehicle.getOwner().getId()).stream()
                    .map(Vehicle::getDriver)
                    .filter(d -> d != null)
                    .findFirst();
            if (fleetDriver.isPresent()) {
                vehicle.setDriver(fleetDriver.get());
                vehicleRepository.save(vehicle);
                return fleetDriver.get();
            }
        }
        return userRepository.findByEmail("driver@goride.demo").orElse(null);
    }

    private String displayChauffeurName(Review r) {
        if (r.getDriver() != null) {
            return r.getDriver().getFirstName() + " " + r.getDriver().getLastName();
        }
        return displayChauffeurName(r.getVehicle());
    }

    private String displayChauffeurName(Vehicle vehicle) {
        if (vehicle != null && vehicle.getDriver() != null) {
            return vehicle.getDriver().getFirstName() + " " + vehicle.getDriver().getLastName();
        }
        if (vehicle != null && vehicle.getOwner() != null) {
            return vehicle.getOwner().getFirstName() + " " + vehicle.getOwner().getLastName();
        }
        return "Chauffeur GoRide";
    }

    private ReviewDTO mapToDTO(Review r) {
        return ReviewDTO.builder()
                .id(r.getId())
                .reservationId(r.getReservation().getId())
                .clientId(r.getClient().getId())
                .clientName(r.getClient().getFirstName() + " " + r.getClient().getLastName())
                .vehicleId(r.getVehicle().getId())
                .vehicleName(r.getVehicle().getBrand() + " " + r.getVehicle().getModel())
                .ownerId(r.getOwner().getId())
                .ownerName(displayChauffeurName(r))
                .vehicleRating(r.getVehicleRating())
                .ownerRating(r.getOwnerRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
