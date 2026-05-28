package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.BookingDTO;
import com.pfeproject.GoRide.dto.MessageResponse;
import com.pfeproject.GoRide.dto.PassengerBookingResponseDTO;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.BookingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur pour la gestion des réservations.
 * Tous les endpoints nécessitent une authentification.
 */
@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class BookingController {

    @Autowired
    private BookingService bookingService;

    /**
     * POST /api/bookings
     * Réserve des places sur un trajet pour l'utilisateur connecté.
     */
    @PostMapping
    public ResponseEntity<?> bookTrip(
            @Valid @RequestBody BookingDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            PassengerBookingResponseDTO result = bookingService.bookForPassenger(userDetails.getId(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/bookings/me
     * Retourne les réservations de l'utilisateur connecté.
     */
    @GetMapping("/me")
    public ResponseEntity<List<PassengerBookingResponseDTO>> getMyBookings(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<PassengerBookingResponseDTO> bookings = bookingService.getBookingsByUser(userDetails.getId());
        return ResponseEntity.ok(bookings);
    }

    /**
     * DELETE /api/bookings/{id}
     * Annule une réservation de l'utilisateur connecté.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelBooking(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            bookingService.cancelBooking(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Réservation annulée avec succès."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * DELETE /api/bookings/by-trip/{tripId}
     * Annule la réservation du passager connecté sur ce trajet partagé.
     */
    @DeleteMapping("/by-trip/{tripId}")
    public ResponseEntity<?> cancelBookingByTrip(
            @PathVariable Long tripId,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            bookingService.cancelBookingByTrip(tripId, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Réservation annulée avec succès."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * GET /api/bookings/trip/{tripId}
     * Retourne toutes les réservations d'un trajet (pour le chauffeur).
     */
    @GetMapping("/trip/{tripId}")
    public ResponseEntity<List<PassengerBookingResponseDTO>> getBookingsByTrip(@PathVariable Long tripId) {
        return ResponseEntity.ok(bookingService.getBookingsByTrip(tripId));
    }

    /**
     * GET /api/bookings/driver/inbox
     * Demandes d'inscription covoiturage pour le chauffeur connecté.
     */
    @GetMapping("/driver/inbox")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PassengerBookingResponseDTO>> getDriverInbox(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.getDriverInboxBookings(userDetails.getId()));
    }

    @PutMapping("/driver/{id}/accept")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> driverAcceptBooking(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            return ResponseEntity.ok(bookingService.driverAcceptBooking(id, userDetails.getId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PutMapping("/driver/{id}/reject")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> driverRejectBooking(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            bookingService.driverRejectBooking(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Demande refusée."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
