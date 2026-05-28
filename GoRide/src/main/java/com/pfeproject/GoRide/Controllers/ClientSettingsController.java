package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.ClientSettingsDTO;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.services.ClientSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/client/settings")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ClientSettingsController {

    @Autowired
    private ClientSettingsService clientSettingsService;

    @Autowired
    private UserRepo userRepository;

    private Long getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<ClientSettingsDTO> getSettings() {
        return ResponseEntity.ok(clientSettingsService.getSettings(getAuthenticatedUserId()));
    }

    @PutMapping
    public ResponseEntity<ClientSettingsDTO> updateAllSettings(@RequestBody ClientSettingsDTO dto) {
        return ResponseEntity.ok(clientSettingsService.updateSettings(getAuthenticatedUserId(), dto));
    }

    @PutMapping("/rental-preferences")
    public ResponseEntity<ClientSettingsDTO> updateRentalPreferences(@RequestBody ClientSettingsDTO dto) {
        return ResponseEntity.ok(clientSettingsService.updateSettings(getAuthenticatedUserId(), dto));
    }

    @PutMapping("/search-preferences")
    public ResponseEntity<ClientSettingsDTO> updateSearchPreferences(@RequestBody ClientSettingsDTO dto) {
        return ResponseEntity.ok(clientSettingsService.updateSettings(getAuthenticatedUserId(), dto));
    }

    @PutMapping("/notification-preferences")
    public ResponseEntity<ClientSettingsDTO> updateNotificationPreferences(@RequestBody ClientSettingsDTO dto) {
        return ResponseEntity.ok(clientSettingsService.updateSettings(getAuthenticatedUserId(), dto));
    }

    @PutMapping("/privacy")
    public ResponseEntity<ClientSettingsDTO> updatePrivacy(@RequestBody ClientSettingsDTO dto) {
        return ResponseEntity.ok(clientSettingsService.updateSettings(getAuthenticatedUserId(), dto));
    }
}
