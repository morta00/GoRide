package com.pfeproject.GoRide.config;

import com.pfeproject.GoRide.entities.ERole;
import com.pfeproject.GoRide.entities.Role;
import com.pfeproject.GoRide.repositories.RoleRepository;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Initialise les données nécessaires au démarrage de l'application.
 * Crée les rôles par défaut s'ils n'existent pas en base de données.
 */
@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        Arrays.stream(ERole.values()).forEach(roleName -> {
            if (!roleRepository.existsByName(roleName)) {
                roleRepository.save(new Role(null, roleName));
                System.out.println("Rôle créé : " + roleName);
            }
        });

        // 2. Vérifier et créer les comptes de test (Seul l'admin est conservé par défaut)
        ensureUserExists("admin@goride.tn", "admin123", "Admin", "GoRide", ERole.ROLE_ADMIN);
    }

    private void ensureUserExists(String email, String password, String firstName, String lastName, ERole roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Error: Role " + roleName + " is not found."));

        Optional<UserEntity> userOpt = userRepo.findByEmail(email);
        if (userOpt.isPresent()) {
            UserEntity user = userOpt.get();
            boolean updated = false;

            if (user.getRoles() == null || user.getRoles().size() != 1 || !user.getRoles().contains(role)) {
                if (user.getRoles() != null) {
                    user.getRoles().clear();
                } else {
                    user.setRoles(new HashSet<>());
                }
                user.getRoles().add(role);
                updated = true;
            }
            if (!Boolean.TRUE.equals(user.getEnabled())) {
                user.setEnabled(true);
                updated = true;
            }
            if (!"VERIFIED".equals(user.getVerificationStatus())) {
                user.setVerificationStatus("VERIFIED");
                updated = true;
            }
            if (!passwordEncoder.matches(password, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(password));
                updated = true;
            }

            if (updated) {
                userRepo.save(user);
                System.out.println("Utilisateur " + email + " mis à jour (rôle, état, ou mot de passe)");
            }
        } else {
            Set<Role> roles = new HashSet<>();
            roles.add(role);

            UserEntity user = UserEntity.builder()
                    .email(email)
                    .password(passwordEncoder.encode(password))
                    .firstName(firstName)
                    .lastName(lastName)
                    .roles(roles)
                    .enabled(true)
                    .verificationStatus("VERIFIED")
                    .build();

            userRepo.save(user);
            System.out.println("Utilisateur " + email + " créé avec succès");
        }
    }
}
