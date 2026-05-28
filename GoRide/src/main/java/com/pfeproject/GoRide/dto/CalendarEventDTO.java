package com.pfeproject.GoRide.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * DTO représentant un événement FullCalendar pour le calendrier des réservations.
 * Format attendu par le frontend Angular/FullCalendar.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventDTO {

    /** Titre affiché sur la case du calendrier */
    private String title;

    /** Date de début de la réservation (format ISO : yyyy-MM-dd) */
    private LocalDate start;

    /** Date de fin de la réservation (format ISO : yyyy-MM-dd) */
    private LocalDate end;

    /** Statut de la réservation : PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED */
    private String status;

    /** Nom du véhicule (marque + modèle) */
    private String vehicleName;

    /** Identifiant de la réservation (pour le lien vers la vue liste) */
    private Long reservationId;

    /** Nom complet du locataire */
    private String renterName;

    /** Prix final ou proposé */
    private Double price;

    /**
     * Couleur hexadécimale côté backend — pratique si la logique de couleur
     * est centralisée dans l'API plutôt que dans le frontend.
     */
    private String color;
}
