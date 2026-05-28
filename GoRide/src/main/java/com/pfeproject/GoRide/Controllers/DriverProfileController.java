package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.DriverProfileDTO;
import com.pfeproject.GoRide.dto.UpdateDriverProfileRequest;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.DriverProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/drivers")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DriverProfileController {

    @Autowired
    private DriverProfileService driverProfileService;

    @GetMapping("/me/profile")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverProfileDTO> getMyProfile(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(driverProfileService.getDriverProfile(userDetails.getId()));
    }

    @PatchMapping("/me/profile")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverProfileDTO> updateMyProfile(Authentication authentication, @RequestBody UpdateDriverProfileRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(driverProfileService.updateDriverProfile(userDetails.getId(), request));
    }
}
