package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.CalendarEventDTO;
import com.pfeproject.GoRide.dto.MessageResponse;
import com.pfeproject.GoRide.dto.RentalContractDTO;
import com.pfeproject.GoRide.entities.RentalContract;
import com.pfeproject.GoRide.entities.RentalStatus;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.RentalService;
import com.pfeproject.GoRide.util.RentalMapper;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rentals")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class RentalController {

    @Autowired
    private RentalService rentalService;

    /** POST /api/rentals/book — Créer une demande de réservation (client) */
    @PostMapping("/book")
    public ResponseEntity<?> createReservation(
            @Valid @RequestBody RentalContractDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            RentalContract contract = rentalService.createReservation(userDetails.getId(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(RentalMapper.toMap(contract));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /** GET /api/rentals/owner — Liste des réservations reçues (propriétaire) */
    @GetMapping("/owner")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<Map<String, Object>>> getOwnerReservations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Map<String, Object>> result = rentalService.getOwnerReservations(userDetails.getId())
                .stream().map(RentalMapper::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** GET /api/rentals/client — Réservations du client connecté */
    @GetMapping("/client")
    public ResponseEntity<List<Map<String, Object>>> getClientReservations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<Map<String, Object>> result = rentalService.getClientReservations(userDetails.getId())
                .stream().map(RentalMapper::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id, Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            RentalContract contract = rentalService.cancelReservation(userDetails.getId(), id);
            return ResponseEntity.ok(RentalMapper.toMap(contract));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<?> getInvoice(@PathVariable Long id, Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            return ResponseEntity.ok(rentalService.getInvoice(userDetails.getId(), id));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/extend")
    public ResponseEntity<?> requestExtension(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String dateStr = body.get("newEndDate");
            java.time.LocalDate newEndDate = java.time.LocalDate.parse(dateStr);
            rentalService.requestExtension(userDetails.getId(), id, newEndDate);
            return ResponseEntity.ok(Map.of("message", "Votre demande de prolongation a été envoyée."));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/respond")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<?> respondToReservation(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            String statusStr = (String) body.get("status");
            Double newPrice = null;
            if (body.get("newPrice") != null) {
                newPrice = Double.valueOf(body.get("newPrice").toString());
            }
            RentalStatus status = RentalStatus.valueOf(statusStr);
            RentalContract contract = rentalService.respondToReservation(
                    userDetails.getId(), id, status, newPrice);
            return ResponseEntity.ok(RentalMapper.toMap(contract));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/owner/calendar")
    @PreAuthorize("hasRole('FLEET_OWNER')")
    public ResponseEntity<List<CalendarEventDTO>> getOwnerCalendar(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<CalendarEventDTO> events = rentalService.getCalendarEvents(userDetails.getId());
        return ResponseEntity.ok(events);
    }
}
