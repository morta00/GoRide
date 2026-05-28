package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * DTO pour la requête d'inscription.
 * confirmPassword est validé ici (côté API) et n'est jamais stocké en BD.
 */
public class SignupRequest {

    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;

    @NotBlank(message = "L'email est obligatoire")
    @Pattern(regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$", message = "Format d'email invalide (ex: nom@domaine.com)")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, max = 100, message = "Le mot de passe doit contenir au moins 8 caractères")
    private String password;

    @NotBlank(message = "La confirmation du mot de passe est obligatoire")
    private String confirmPassword;

    @jakarta.validation.constraints.Pattern(regexp = "^(\\+216)?[0-9]{8}$", message = "Format de téléphone invalide (ex: 98123456 ou +21698123456)")
    private String phone;

    @jakarta.validation.constraints.NotEmpty(message = "Au moins un rôle est obligatoire")
    private java.util.Set<String> roles; // CLIENT, DRIVER, FLEET_OWNER, COMPANY

    private String city;

    private Boolean hasFleet;

    public SignupRequest() {}

    // Getters & Setters
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { 
        this.email = email != null ? email.trim().toLowerCase() : null; 
    }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public java.util.Set<String> getRoles() { return roles; }
    public void setRoles(java.util.Set<String> roles) { this.roles = roles; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public Boolean getHasFleet() { return hasFleet; }
    public void setHasFleet(Boolean hasFleet) { this.hasFleet = hasFleet; }
}
