package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.ERole;
import com.pfeproject.GoRide.entities.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(ERole name);
    boolean existsByName(ERole name);
}
