package com.pfeproject.GoRide.dto;

/**
 * DTO générique pour les réponses de message simple (succès ou erreur).
 */
public class MessageResponse {

    private String message;

    public MessageResponse(String message) {
        this.message = message;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
