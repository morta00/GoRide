package com.pfeproject.GoRide.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Entité principale représentant un utilisateur de la plateforme GoRide.
 * Un utilisateur peut avoir plusieurs rôles (Client, Chauffeur, Fleet Owner, Entreprise, Admin).
 *
 * ⚠️ Note : confirmPassword n'est PAS stocké en BD.
 *    Il est géré dans les DTOs (SignupRequest) côté API.
 */
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = true, length = 50)
    private String firstName;

    @Column(name = "last_name", nullable = true, length = 50)
    private String lastName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String country;

    @Column(length = 20)
    private String gender;

    @Column(name = "birth_date")
    private String birthDate;

    @Column(name = "photo_url", length = 5000)
    private String photoUrl;

    @Column(length = 100)
    private String city;

    @Column(name = "has_fleet")
    private Boolean hasFleet = false;

    @Column(name = "wallet_balance")
    @Builder.Default
    private Double walletBalance = 0.0;

    @Column(name = "loyalty_points")
    @Builder.Default
    private Integer loyaltyPoints = 0;

    @Column(name = "loyalty_tier")
    @Builder.Default
    private String loyaltyTier = "Bronze";

    @Column(name = "verification_status")
    @Builder.Default
    private String verificationStatus = "PENDING"; // PENDING, VERIFIED, REJECTED

    @Column(name = "profile_completion")
    @Builder.Default
    private Integer profileCompletion = 0;

    // Preferences
    @Column(name = "theme")
    @Builder.Default
    private String theme = "light";

    @Column(name = "language")
    @Builder.Default
    private String language = "fr";

    @Column(name = "notif_email")
    @Builder.Default
    private Boolean notifEmail = true;

    @Column(name = "notif_sms")
    @Builder.Default
    private Boolean notifSms = false;

    @Column(name = "notif_push")
    @Builder.Default
    private Boolean notifPush = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "reset_token", length = 100)
    private String resetToken;

    @Column(name = "reset_token_expiration")
    private LocalDateTime resetTokenExpiration;

    @Column(name = "last_password_update")
    private LocalDateTime lastPasswordUpdate;

    // 2FA Security
    @Column(name = "two_factor_enabled")
    @Builder.Default
    private Boolean twoFactorEnabled = false;

    @Column(name = "two_factor_secret", length = 100)
    private String twoFactorSecret;

    @Column(name = "two_factor_temp_secret", length = 100)
    private String twoFactorTempSecret;

    // Relation Many-to-Many avec les rôles
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    // MANUAL GETTERS/SETTERS
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Boolean getHasFleet() { return hasFleet; }
    public void setHasFleet(Boolean hasFleet) { this.hasFleet = hasFleet; }
    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
    public Boolean getTwoFactorEnabled() { return twoFactorEnabled != null && twoFactorEnabled; }
    public void setTwoFactorEnabled(Boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }
    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }
    public String getTwoFactorTempSecret() { return twoFactorTempSecret; }
    public void setTwoFactorTempSecret(String twoFactorTempSecret) { this.twoFactorTempSecret = twoFactorTempSecret; }
    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }
    public LocalDateTime getResetTokenExpiration() { return resetTokenExpiration; }
    public void setResetTokenExpiration(LocalDateTime resetTokenExpiration) { this.resetTokenExpiration = resetTokenExpiration; }
    public Double getWalletBalance() { return walletBalance; }
    public void setWalletBalance(Double walletBalance) { this.walletBalance = walletBalance; }
    public Integer getLoyaltyPoints() { return loyaltyPoints; }
    public void setLoyaltyPoints(Integer loyaltyPoints) { this.loyaltyPoints = loyaltyPoints; }
}
