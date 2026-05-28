package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.entities.Notification;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotificationsLegacy(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(notificationService.getNotificationsByUser(userDetails.getId()));
    }

    @GetMapping("/me")
    public ResponseEntity<List<Notification>> getMyNotifications(
            @RequestParam(value = "mode", required = false) String mode,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(notificationService.getNotificationsByUser(userDetails.getId(), mode));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCountLegacy(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        long count = notificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(java.util.Map.of("count", count));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @RequestParam(value = "mode", required = false) String mode,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        long count = (mode != null && !mode.isBlank())
                ? notificationService.getUnreadCountForMode(userDetails.getId(), mode)
                : notificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(java.util.Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        notificationService.markAllAsRead(userDetails.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }
}
