package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO pour la requête de connexion.
 */
public class LoginRequest {

    @NotBlank(message = "L'email est obligatoire")
    @Pattern(regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$", message = "Format d'email invalide (ex: nom@domaine.com)")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;

    public LoginRequest() {}

    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { 
        this.email = email != null ? email.trim().toLowerCase() : null; 
    }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
