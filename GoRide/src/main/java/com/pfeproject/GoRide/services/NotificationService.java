package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.entities.Notification;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.NotificationRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    @Lazy
    private EmailService emailService;

    @Transactional
    public Notification createNotification(Long userId, String title, String message, String type, String targetUrl) {
        UserEntity user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .targetUrl(targetUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        if (Boolean.TRUE.equals(user.getNotifEmail())
                && user.getEmail() != null && !user.getEmail().isBlank()) {
            emailService.sendNotificationEmail(
                    user.getEmail(),
                    user.getFirstName(),
                    title,
                    message,
                    targetUrl
            );
        }

        return saved;
    }

    public List<Notification> getNotificationsByUser(Long userId) {
        return getNotificationsByUser(userId, null);
    }

    public List<Notification> getNotificationsByUser(Long userId, String mode) {
        List<Notification> all = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (mode == null || mode.isBlank()) {
            return all;
        }
        return all.stream()
                .filter(n -> matchesClientMode(n, mode))
                .toList();
    }

    public long getUnreadCount(Long userId) {
        return countUnreadNotifications(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId), null);
    }

    /**
     * Compte les notifications non lues visibles pour le mode client (TENANT = locataire, PASSENGER = passager).
     * Aligné sur le filtre de la page notifications Angular.
     */
    public long getUnreadCountForMode(Long userId, String mode) {
        return countUnreadNotifications(
                notificationRepository.findByUserIdOrderByCreatedAtDesc(userId),
                mode);
    }

    private long countUnreadNotifications(List<Notification> notifications, String mode) {
        return notifications.stream()
                .filter(n -> !Boolean.TRUE.equals(n.getIsRead()))
                .filter(n -> matchesClientMode(n, mode))
                .count();
    }

    private boolean matchesClientMode(Notification n, String mode) {
        if (mode == null || mode.isBlank()) {
            return true;
        }
        String text = ((n.getTitle() != null ? n.getTitle() : "") + " "
                + (n.getMessage() != null ? n.getMessage() : "")).toLowerCase();
        boolean hasPassengerKeyword = text.contains("course") || text.contains("chauffeur")
                || text.contains("trajet") || text.contains("passager") || text.contains("covoiturage")
                || text.contains("reservation") || text.contains("réservation")
                || text.contains("demande") || text.contains("inscription")
                || text.contains("partagé") || text.contains("partage");
        boolean hasRentalKeyword = text.contains("location") || text.contains("véhicule")
                || text.contains("vehicule") || text.contains("contrat")
                || text.contains("propriétaire") || text.contains("proprietaire")
                || text.contains("loué") || text.contains("loue") || text.contains("louer")
                || text.contains("caution") || text.contains("louée");

        if ("TENANT".equalsIgnoreCase(mode)) {
            return hasRentalKeyword || !hasPassengerKeyword;
        }
        if ("PASSENGER".equalsIgnoreCase(mode)) {
            return !hasRentalKeyword;
        }
        return true;
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(n -> !n.getIsRead())
                .toList();

        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }
}
