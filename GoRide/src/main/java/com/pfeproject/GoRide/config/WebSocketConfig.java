package com.pfeproject.GoRide.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuration des WebSockets avec STOMP.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Active un broker simple en mémoire pour les destinations préfixées par /topic et /queue
        config.enableSimpleBroker("/topic", "/queue", "/user");
        // Définit le préfixe pour les messages envoyés depuis le client vers le serveur (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
        // Préfixe pour les messages destinés à un utilisateur spécifique
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Point d'entrée pour la connexion WebSocket (avec support SockJS pour la compatibilité)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:4200")
                .withSockJS();
    }
}
