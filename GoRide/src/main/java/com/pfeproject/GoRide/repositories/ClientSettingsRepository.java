package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.ClientSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClientSettingsRepository extends JpaRepository<ClientSettings, Long> {
    Optional<ClientSettings> findByUserId(Long userId);
}
