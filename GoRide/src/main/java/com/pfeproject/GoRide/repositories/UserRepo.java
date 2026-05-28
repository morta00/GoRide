package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository pour les utilisateurs.
 * Refactorisé pour supporter l'authentification JWT.
 */
@Repository
public interface UserRepo extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<UserEntity> findByResetToken(String token);
}
