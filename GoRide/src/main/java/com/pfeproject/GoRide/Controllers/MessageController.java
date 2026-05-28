package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.ConversationDTO;
import com.pfeproject.GoRide.dto.MessageDTO;
import com.pfeproject.GoRide.entities.Conversation;
import com.pfeproject.GoRide.entities.Message;
import com.pfeproject.GoRide.security.UserDetailsImpl;
import com.pfeproject.GoRide.services.MessagingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur REST pour la gestion de la messagerie privée.
 */
@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class MessageController {

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    /**
     * GET /api/messages/conversations
     * Récupère toutes les conversations de l'utilisateur connecté.
     */
    @GetMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ConversationDTO>> getMyConversations(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(messagingService.getUserConversations(userDetails.getId()));
    }

    /**
     * GET /api/messages/conversations/{id}/messages
     * Récupère l'historique des messages d'une conversation.
     */
    @GetMapping("/conversations/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MessageDTO>> getConversationMessages(@PathVariable Long id) {
        return ResponseEntity.ok(messagingService.getConversationMessages(id));
    }

    /**
     * POST /api/messages/conversations
     * Crée ou récupère une conversation existante entre deux utilisateurs pour un véhicule.
     */
    @PostMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ConversationDTO> createConversation(@RequestBody Map<String, Long> payload, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long currentUserId = userDetails.getId();
        
        Long otherId = payload.get("otherId");
        Long vehicleId = payload.get("vehicleId");

        // Détermination des rôles pour l'entité Conversation (owner vs client)
        boolean isCurrentOwner = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FLEET_OWNER"));
        
        Long ownerId = isCurrentOwner ? currentUserId : otherId;
        Long clientId = isCurrentOwner ? otherId : currentUserId;
        
        Conversation conv = messagingService.createOrGetConversation(ownerId, clientId, vehicleId);
        return ResponseEntity.ok(messagingService.convertToConversationDTO(conv, currentUserId));
    }

    /**
     * POST /api/messages/conversations/{id}/send
     * Envoie un message dans une conversation.
     */
    @PostMapping("/conversations/{id}/send")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageDTO> sendMessage(@PathVariable Long id, @RequestBody Map<String, String> payload, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String content = payload.get("content");
        
        Message msg = messagingService.sendMessage(id, userDetails.getId(), content);
        return ResponseEntity.ok(messagingService.convertToMessageDTO(msg));
    }

    /**
     * PATCH /api/messages/conversations/{id}/read
     * Marque tous les messages reçus de la conversation comme lus.
     */
    @PatchMapping("/conversations/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        messagingService.markAsRead(id, userDetails.getId());
        
        // Notifier l'autre participant que ses messages ont été lus
        com.pfeproject.GoRide.entities.Conversation conv = messagingService.getConversationEntity(id);
        Long otherId = conv.getOwner().getId().equals(userDetails.getId()) ? conv.getClient().getId() : conv.getOwner().getId();
        
        Map<String, Object> readEvent = new java.util.HashMap<>();
        readEvent.put("conversationId", id);
        readEvent.put("readerId", userDetails.getId());
        readEvent.put("status", "READ");
        
        messagingTemplate.convertAndSendToUser(otherId.toString(), "/queue/notifications", readEvent);
        
        return ResponseEntity.ok().build();
    }

    @org.springframework.messaging.handler.annotation.MessageMapping("/conversations/{id}/typing")
    @org.springframework.messaging.handler.annotation.SendTo("/topic/conversations/{id}/typing")
    public Map<String, Object> handleTyping(@org.springframework.messaging.handler.annotation.DestinationVariable Long id, Map<String, Object> payload) {
        return payload;
    }
}
