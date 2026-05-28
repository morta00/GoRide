package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.ConversationDTO;
import com.pfeproject.GoRide.dto.MessageDTO;
import com.pfeproject.GoRide.entities.Conversation;
import com.pfeproject.GoRide.entities.Message;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.repositories.ConversationRepository;
import com.pfeproject.GoRide.repositories.MessageRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service gérant la logique métier de la messagerie privée.
 */
@Service
public class MessagingService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Conversation createOrGetConversation(Long ownerId, Long clientId, Long vehicleId) {
        return createOrGetConversation(ownerId, clientId, vehicleId, null, "RENTAL_CLIENT");
    }

    /**
     * Conversation passager ↔ chauffeur pour une demande de course (RideRequest).
     * owner = chauffeur, client = passager, bookingId = rideRequestId
     */
    @Transactional
    public Conversation createOrGetRideConversation(Long driverId, Long passengerId, Long rideRequestId) {
        return conversationRepository.findRideRequestConversation(driverId, passengerId, rideRequestId)
                .orElseGet(() -> {
                    UserEntity driver = userRepo.findById(driverId)
                            .orElseThrow(() -> new RuntimeException("Chauffeur non trouvé"));
                    UserEntity passenger = userRepo.findById(passengerId)
                            .orElseThrow(() -> new RuntimeException("Passager non trouvé"));

                    Conversation conv = Conversation.builder()
                            .owner(driver)
                            .client(passenger)
                            .vehicle(null)
                            .bookingId(rideRequestId)
                            .context("RIDE_REQUEST")
                            .createdAt(LocalDateTime.now())
                            .build();
                    return conversationRepository.save(conv);
                });
    }

    @Transactional
    public Conversation createOrGetConversation(Long ownerId, Long clientId, Long vehicleId, Long bookingId, String context) {
        return conversationRepository.findExistingConversation(ownerId, clientId, vehicleId, bookingId)
                .orElseGet(() -> {
                    UserEntity owner = userRepo.findById(ownerId)
                            .orElseThrow(() -> new RuntimeException("Propriétaire non trouvé"));
                    UserEntity client = userRepo.findById(clientId)
                            .orElseThrow(() -> new RuntimeException("Client non trouvé"));
                    Vehicle vehicle = vehicleId != null ? vehicleRepository.findById(vehicleId).orElse(null) : null;

                    Conversation conv = Conversation.builder()
                            .owner(owner)
                            .client(client)
                            .vehicle(vehicle)
                            .bookingId(bookingId)
                            .context(context != null ? context : "RENTAL")
                            .createdAt(LocalDateTime.now())
                            .build();
                    return conversationRepository.save(conv);
                });
    }

    @Transactional
    public Message sendMessage(Long conversationId, Long senderId, String content) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));
        UserEntity sender = userRepo.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Expéditeur non trouvé"));

        Message msg = Message.builder()
                .conversation(conv)
                .sender(sender)
                .content(content)
                .timestamp(LocalDateTime.now())
                .isRead(false)
                .build();

        Message saved = messageRepository.save(msg);
        
        // Convertir en DTO pour l'envoi WebSocket
        MessageDTO dto = convertToMessageDTO(saved);
        
        // Diffuser aux abonnés de la conversation
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, dto);
        
        // Diffuser une notification à l'utilisateur destinataire (pour le badge non lu)
        Long recipientId = conv.getOwner().getId().equals(senderId) 
                           ? conv.getClient().getId() 
                           : conv.getOwner().getId();
        
        messagingTemplate.convertAndSendToUser(recipientId.toString(), "/queue/messages", dto);
        
        return saved;
    }

    @Transactional(readOnly = true)
    public List<MessageDTO> getConversationMessages(Long conversationId) {
        return getConversationMessages(conversationId, null);
    }

    @Transactional(readOnly = true)
    public List<MessageDTO> getConversationMessages(Long conversationId, Long viewerUserId) {
        return messageRepository.findByConversationIdOrderByTimestampAsc(conversationId).stream()
                .map(m -> convertToMessageDTO(m, viewerUserId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ConversationDTO> getUserConversations(Long userId) {
        return conversationRepository.findAllByUserId(userId).stream()
                .map(conv -> convertToConversationDTO(conv, userId))
                .collect(Collectors.toList());
    }

    /** Messages non lus pour l'utilisateur, optionnellement filtrés par contexte de conversation. */
    @Transactional(readOnly = true)
    public long countUnreadMessagesForUser(Long userId, String context) {
        return conversationRepository.findAllByUserId(userId).stream()
                .filter(c -> matchesContext(c.getContext(), context))
                .mapToLong(c -> messageRepository.countUnreadMessages(c.getId(), userId))
                .sum();
    }

    /** Messages non lus hors d'un contexte (ex. passager = tout sauf location). */
    @Transactional(readOnly = true)
    public long countUnreadMessagesForUserExcluding(Long userId, String excludedContext) {
        return conversationRepository.findAllByUserId(userId).stream()
                .filter(c -> !matchesContext(c.getContext(), excludedContext))
                .mapToLong(c -> messageRepository.countUnreadMessages(c.getId(), userId))
                .sum();
    }

    private boolean matchesContext(String conversationContext, String filter) {
        if (filter == null || filter.isBlank()) {
            return true;
        }
        String ctx = conversationContext != null ? conversationContext.toUpperCase() : "";
        return ctx.contains(filter.toUpperCase());
    }

    @Transactional
    public void markAsRead(Long conversationId, Long userId) {
        messageRepository.markAsRead(conversationId, userId);
    }

    public MessageDTO convertToMessageDTO(Message msg) {
        return convertToMessageDTO(msg, null);
    }

    public MessageDTO convertToMessageDTO(Message msg, Long viewerUserId) {
        Long senderId = msg.getSender().getId();
        boolean mine = viewerUserId != null && viewerUserId.equals(senderId);
        return MessageDTO.builder()
                .id(msg.getId())
                .conversationId(msg.getConversation().getId())
                .senderId(senderId)
                .senderName(msg.getSender().getFirstName() + " " + msg.getSender().getLastName())
                .content(msg.getContent())
                .timestamp(msg.getTimestamp())
                .isRead(msg.getIsRead())
                .mine(mine)
                .build();
    }

    public Conversation getConversationEntity(Long id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));
    }

    public ConversationDTO convertToConversationDTO(Conversation conv, Long currentUserId) {
        UserEntity other = conv.getOwner().getId().equals(currentUserId) ? conv.getClient() : conv.getOwner();
        
        Message lastMsg = messageRepository.findFirstByConversationIdOrderByTimestampDesc(conv.getId());

        return ConversationDTO.builder()
                .id(conv.getId())
                .ownerId(conv.getOwner().getId())
                .clientId(conv.getClient().getId())
                .otherParticipantName(other.getFirstName() + " " + other.getLastName())
                .otherParticipantPhoto(other.getPhotoUrl())
                .vehicleId(conv.getVehicle() != null ? conv.getVehicle().getId() : null)
                .vehicleName(conv.getVehicle() != null ? conv.getVehicle().getBrand() + " " + conv.getVehicle().getModel() : "Général")
                .lastMessage(lastMsg != null ? lastMsg.getContent() : "")
                .lastMessageTimestamp(lastMsg != null ? lastMsg.getTimestamp() : conv.getCreatedAt())
                .unreadCount(messageRepository.countUnreadMessages(conv.getId(), currentUserId))
                .build();
    }
}
