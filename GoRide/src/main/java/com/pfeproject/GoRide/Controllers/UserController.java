package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.ChangePasswordRequest;
import com.pfeproject.GoRide.dto.MessageResponse;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur pour les opérations sur les utilisateurs authentifiés.
 * Toutes les routes nécessitent un token JWT valide.
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class UserController {

    @Autowired
    private UserService userService;

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

    /**
     * GET /api/users/me
     * Retourne les informations de l'utilisateur connecté.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UserEntity user = userService.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return ResponseEntity.ok(user);
    }

    /**
     * PATCH /api/users/me
     * Met à jour le profil de l'utilisateur connecté.
     */
    @PatchMapping("/me")
    public ResponseEntity<?> updateCurrentUser(Authentication authentication,
                                                @RequestBody UserEntity updatedData) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UserEntity updated = userService.updateProfile(userDetails.getId(), updatedData);
        return ResponseEntity.ok(updated);
    }

    /**
     * PUT /api/users/me/password
     * Met à jour le mot de passe de l'utilisateur connecté.
     */
    @PutMapping("/me/password")
    public ResponseEntity<?> updatePassword(Authentication authentication,
                                           @Valid @RequestBody ChangePasswordRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        try {
            userService.changePassword(userDetails.getId(), request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(new MessageResponse("Mot de passe mis à jour avec succès."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/users/me/transactions
     * Retourne l'historique des transactions de l'utilisateur connecté.
     */
    @GetMapping("/me/transactions")
    public ResponseEntity<?> getMyTransactions(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserTransactions(userDetails.getId()));
    }

    /**
     * GET /api/users/me/activities
     * Retourne l'historique des activités de l'utilisateur connecté.
     */
    @GetMapping("/me/activities")
    public ResponseEntity<?> getMyActivities(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserActivities(userDetails.getId()));
    }

    /**
     * GET /api/users/me/bookings
     * Retourne les réservations de l'utilisateur connecté.
     */
    @GetMapping("/me/bookings")
    public ResponseEntity<?> getMyBookings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserBookings(userDetails.getId()));
    }

    /**
     * GET /api/users/me/documents
     * Retourne les documents de l'utilisateur connecté.
     */
    @GetMapping("/me/documents")
    public ResponseEntity<?> getMyDocuments(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(userService.getUserDocuments(userDetails.getId()));
    }

    /**
     * GET /api/users/sidebar-counts
     * Retourne les compteurs de la barre latérale pour l'utilisateur connecté.
     */
    @GetMapping("/sidebar-counts")
    public ResponseEntity<?> getClientSidebarCounts(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long userId = userDetails.getId();

        // 1. Trips count (real bookings of passenger)
        long tripsCount = bookingRepository.findByPassengerId(userId).size();

        // 2. Pending reviews count
        long pendingReviewsCount = reviewService.getPendingReviews(userId).size();

        // 3. Messages non lus
        long conversationsCount = messagingService.countUnreadMessagesForUser(userId, null);

        // 4. Notifications non lues
        long notificationsCount = notificationService.getUnreadCount(userId);

        // 5. Current ride count (1 if there is an active ride request, else 0)
        long currentRideCount = 0;
        try {
            var currentRide = rideRequestService.getCurrentClientRide(userId);
            if (currentRide != null) {
                currentRideCount = 1;
            }
        } catch (Exception e) {
            // No current ride
        }

        java.util.Map<String, Long> counts = new java.util.HashMap<>();
        counts.put("trips", tripsCount);
        counts.put("pendingReviews", pendingReviewsCount);
        counts.put("conversations", conversationsCount);
        counts.put("notifications", notificationsCount);
        counts.put("currentRide", currentRideCount);

        return ResponseEntity.ok(counts);
    }

    /**
     * DELETE /api/admin/users/{id}
     * Supprime un utilisateur (Admin uniquement).
     */
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().body("Utilisateur supprimé avec succès.");
    }
}
