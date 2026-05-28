package com.pfeproject.GoRide.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "company_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, unique = true)
    private Long companyId;

    @Column(name = "settings_json", columnDefinition = "TEXT")
    private String settingsJson;
}
