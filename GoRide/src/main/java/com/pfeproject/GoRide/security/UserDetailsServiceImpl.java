package com.pfeproject.GoRide.security;

import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service qui charge un utilisateur depuis la BD pour Spring Security.
 * Appelé automatiquement lors de l'authentification.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private UserRepo userRepo;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        System.out.println("[DEBUG] Recherche de l'utilisateur en BD pour : " + email);
        UserEntity user = userRepo.findByEmail(email)
                .orElseThrow(() -> {
                    System.out.println("[DEBUG] Utilisateur non trouvé : " + email);
                    return new UsernameNotFoundException("Utilisateur non trouvé avec l'email : " + email);
                });

        System.out.println("[DEBUG] Utilisateur trouvé, chargement des détails...");
        return UserDetailsImpl.build(user);
    }
}
