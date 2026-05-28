package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.RideRequestResponseDto;
import com.pfeproject.GoRide.entities.RideRequest;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.RideRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class RideRequestController {

    @Autowired
    private RideRequestService rideRequestService;

    // --- CLIENT ENDPOINTS ---

    @PostMapping("/api/rides/requests")
    @PreAuthorize("hasAnyRole('CLIENT', 'USER')")
    public ResponseEntity<RideRequestResponseDto> createRequest(Authentication authentication, @RequestBody RideRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        System.out.println("[DEBUG] Controller createRequest - User: " + userDetails.getEmail() + " (ID: " + userDetails.getId() + ")");
        RideRequestResponseDto created = rideRequestService.createRequest(request, userDetails.getId());
        return ResponseEntity.ok(created);
    }

    @GetMapping("/api/rides/requests/client/me")
    @PreAuthorize("hasAnyRole('CLIENT', 'USER')")
    public ResponseEntity<List<RideRequestResponseDto>> getMyRideRequests(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        System.out.println("[DEBUG] Controller getMyRideRequests - User: " + userDetails.getEmail() + " (ID: " + userDetails.getId() + ")");
        return ResponseEntity.ok(rideRequestService.getClientRequests(userDetails.getId()));
    }

    @GetMapping("/api/rides/requests/client/me/current")
    @PreAuthorize("hasAnyRole('CLIENT', 'USER')")
    public ResponseEntity<RideRequestResponseDto> getMyCurrentRide(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        RideRequestResponseDto current = rideRequestService.getCurrentClientRide(userDetails.getId());
        if (current == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(current);
    }

    // --- DRIVER ENDPOINTS ---

    @GetMapping("/api/rides/requests/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getRideRequestById(
            @PathVariable Long id,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        try {
            return ResponseEntity.ok(rideRequestService.getRequestForViewer(id, userDetails.getId()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/api/rides/requests/driver/pending")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<RideRequestResponseDto>> getPendingDriverRequests() {
        System.out.println("[DEBUG] DRIVER PENDING CALLED");
        List<RideRequestResponseDto> requests = rideRequestService.getPendingRequests();
        System.out.println("[DEBUG] Found PENDING: " + requests.size());
        return ResponseEntity.ok(requests);
    }

    @PutMapping("/api/rides/requests/{id}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> acceptRideRequest(Authentication authentication, @PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        System.out.println("[DEBUG] ACCEPT REQUEST CALLED - ID: " + id + " by Driver: " + userDetails.getEmail());
        try {
            RideRequestResponseDto accepted = rideRequestService.acceptRequest(id, userDetails.getId());
            return ResponseEntity.ok(accepted);
        } catch (Exception e) {
            System.err.println("[ERROR] Accept failed: " + e.getMessage());
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/api/rides/requests/{id}/reject")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> rejectRideRequest(@PathVariable Long id) {
        System.out.println("[DEBUG] REJECT REQUEST CALLED - ID: " + id);
        try {
            return ResponseEntity.ok(rideRequestService.rejectRequest(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/api/rides/requests/{id}/start")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> startRideRequest(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(rideRequestService.startRequest(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/api/rides/requests/{id}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<?> completeRideRequest(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(rideRequestService.completeRequest(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/api/rides/requests/{id}/cancel")
    public ResponseEntity<?> cancelRideRequest(@PathVariable Long id) {
        return ResponseEntity.ok(rideRequestService.cancelRequest(id));
    }

    // --- ADMIN ENDPOINTS ---

    @GetMapping("/api/admin/services/rides")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RideRequestResponseDto>> getAdminRideServices() {
        return ResponseEntity.ok(rideRequestService.getAllRequests());
    }
}
