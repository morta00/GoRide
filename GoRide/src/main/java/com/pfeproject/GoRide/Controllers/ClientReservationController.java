package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.MessageResponse;
import com.pfeproject.GoRide.dto.RentalContractDTO;
import com.pfeproject.GoRide.entities.RentalContract;
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

@RestController
@RequestMapping("/api/client/reservations")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class ClientReservationController {

    @Autowired
    private RentalService rentalService;

    @PostMapping
    @PreAuthorize("hasRole('CLIENT') or hasRole('FLEET_OWNER') or hasRole('DRIVER')")
    public ResponseEntity<?> createReservation(
            @Valid @RequestBody RentalContractDTO dto,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Validation: Return date must be after start date
            if (dto.getEndDate().isBefore(dto.getStartDate())) {
                return ResponseEntity.badRequest().body(new MessageResponse("La date de retour doit être après la date de début."));
            }

            RentalContract contract = rentalService.createReservation(userDetails.getId(), dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(RentalMapper.toMap(contract));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('CLIENT') or hasRole('FLEET_OWNER') or hasRole('DRIVER')")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getClientReservations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        java.util.List<java.util.Map<String, Object>> result = rentalService.getClientReservations(userDetails.getId())
                .stream().map(RentalMapper::toMap).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
