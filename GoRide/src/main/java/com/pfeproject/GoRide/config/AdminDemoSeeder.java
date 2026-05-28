package com.pfeproject.GoRide.config;

import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Données admin pour soutenance — réclamations, support, signalements, paiements (Tunisie, TND).
 */
@Component
public class AdminDemoSeeder {

    public static final String MARKER = "[GORIDE-ADMIN-DEMO]";
    public static final String CORP_NOTIF_MARKER = "[GORIDE-CORP-DEMO]";
    private static final String ADMIN_EMAIL = "admin@goride.tn";

    @Transactional
    public void seedIfNeeded(
            UserRepo userRepo,
            PlatformComplaintRepository complaintRepository,
            SupportTicketRepository supportTicketRepository,
            PlatformReportRepository reportRepository,
            TransactionRepository transactionRepository,
            NotificationRepository notificationRepository,
            VehicleRepository vehicleRepository) {
        Optional<UserEntity> adminOpt = userRepo.findByEmail(ADMIN_EMAIL);
        if (adminOpt.isEmpty()) {
            return;
        }
        UserEntity admin = adminOpt.get();

        purgeDemo(complaintRepository, supportTicketRepository, reportRepository, transactionRepository,
                notificationRepository, admin.getId());

        int complaints = seedComplaints(complaintRepository);
        int tickets = seedSupportTickets(supportTicketRepository);
        int reports = seedReports(reportRepository);
        int payments = seedTransactions(transactionRepository, userRepo);
        int companyPayments = seedCompanyPayments(transactionRepository, userRepo);
        int companyNotifs = seedCompanyNotifications(notificationRepository, userRepo);
        int notifs = seedAdminNotifications(notificationRepository, admin);
        int validations = seedPendingValidations(vehicleRepository);

        System.out.println("[AdminDemoSeeder] OK — " + complaints + " réclamations, " + tickets
                + " tickets support, " + reports + " signalements, " + payments + " transactions admin, "
                + companyPayments + " paiements entreprise, "
                + companyNotifs + " notifications entreprise"
                + (validations > 0 ? ", " + validations + " véhicule(s) à valider" : ""));
        System.out.println("[AdminDemoSeeder] >>> Admin: " + ADMIN_EMAIL + " / admin123");
    }

    private void purgeDemo(
            PlatformComplaintRepository complaintRepository,
            SupportTicketRepository supportTicketRepository,
            PlatformReportRepository reportRepository,
            TransactionRepository transactionRepository,
            NotificationRepository notificationRepository,
            Long adminUserId) {
        complaintRepository.findByDemoMarker(MARKER).forEach(complaintRepository::delete);
        supportTicketRepository.findByDemoMarker(MARKER).forEach(supportTicketRepository::delete);
        reportRepository.findByDemoMarker(MARKER).forEach(reportRepository::delete);
        transactionRepository.findAll().stream()
                .filter(t -> t.getTransactionId() != null && t.getTransactionId().startsWith("TX-DEMO-"))
                .forEach(transactionRepository::delete);
        notificationRepository.findByUserIdOrderByCreatedAtDesc(adminUserId).stream()
                .filter(n -> n.getMessage() != null && n.getMessage().contains(MARKER))
                .forEach(notificationRepository::delete);
    }

    private int seedComplaints(PlatformComplaintRepository repo) {
        LocalDateTime now = LocalDateTime.now();
        Object[][] rows = {
                {"CMP-2026-001", "Double débit location Sfax", "ROLE_CLIENT", "Riadh Landolsi",
                        "ROLE_FLEET_OWNER", "Ahmed Abidi", "PAYMENT", "HIGH", "OPEN",
                        "RC-SF-124", "Prélèvement de 124 DT deux fois pour la même location (Dacia Logan, 2 j).", 2},
                {"CMP-2026-002", "Retard remise véhicule — Tunis Lac 2", "ROLE_CLIENT", "Amira Gharbi",
                        "ROLE_FLEET_OWNER", "Ahmed Abidi", "SERVICE", "MEDIUM", "IN_REVIEW",
                        "RC-TU-088", "Retard de 2 h à la prise en charge Peugeot 208, rendez-vous professionnel manqué.", 5},
                {"CMP-2026-003", "Comportement chauffeur — Tunis → Sousse", "ROLE_CLIENT", "Karim Mansouri",
                        "ROLE_DRIVER", "Imed Kilani", "BEHAVIOR", "HIGH", "WAITING_RESPONSE",
                        "TRIP-4521", "Conduite agressive et refus climatisation sur trajet covoiturage.", 1},
                {"CMP-2026-004", "Remboursement non reçu", "ROLE_CLIENT", "Riadh Landolsi",
                        "ROLE_FLEET_OWNER", "Ahmed Abidi", "PAYMENT", "MEDIUM", "OPEN",
                        "RC-TU-055", "Annulation acceptée il y a 8 jours — 58 DT non recrédités.", 8},
                {"CMP-2026-005", "Freins douteux — location Sousse", "ROLE_CLIENT", "Amira Gharbi",
                        "ROLE_FLEET_OWNER", "Ahmed Abidi", "SAFETY", "HIGH", "IN_REVIEW",
                        "RC-SO-210", "Bruit métallique au freinage, véhicule Volkswagen Polo.", 3},
                {"CMP-2026-006", "Véhicule différent du modèle réservé", "ROLE_COMPANY", "Société GoRide",
                        "ROLE_FLEET_OWNER", "Ahmed Abidi", "SERVICE", "LOW", "RESOLVED",
                        "RC-TU-310", "Symbol livré à la place du Polo — échange effectué sous 24 h.", 20},
                {"CMP-2026-007", "Commission plateforme contestée", "ROLE_FLEET_OWNER", "Ahmed Abidi",
                        "ROLE_ADMIN", "GoRide Plateforme", "PAYMENT", "MEDIUM", "RESOLVED",
                        "PAY-APR", "Clarification facture commission 10 % — dossier clos.", 15},
                {"CMP-2026-008", "Annulation sans préavis chauffeur", "ROLE_CLIENT", "Karim Mansouri",
                        "ROLE_DRIVER", "Imed Kilani", "BEHAVIOR", "MEDIUM", "OPEN",
                        "TRIP-8890", "Trajet Monastir–Sousse annulé 30 min avant le départ.", 12},
        };

        int added = 0;
        for (Object[] r : rows) {
            String caseId = (String) r[0];
            if (repo.findByCaseId(caseId).isPresent()) continue;
            int daysAgo = (Integer) r[11];
            LocalDateTime created = now.minusDays(daysAgo);
            repo.save(PlatformComplaint.builder()
                    .caseId(caseId)
                    .title((String) r[1])
                    .complainantRole((String) r[2])
                    .complainantName((String) r[3])
                    .accusedRole((String) r[4])
                    .accusedName((String) r[5])
                    .category((String) r[6])
                    .priority((String) r[7])
                    .status((String) r[8])
                    .relatedServiceId((String) r[9])
                    .description((String) r[10])
                    .createdAt(created)
                    .updatedAt(created.plusHours(4))
                    .demoMarker(MARKER)
                    .build());
            added++;
        }
        return added;
    }

    private int seedSupportTickets(SupportTicketRepository repo) {
        LocalDateTime now = LocalDateTime.now();
        Object[][] rows = {
                {"TKT-2026-101", "Paiement D17 refusé à la réservation", "Riadh Landolsi", "ROLE_CLIENT",
                        "PAYMENT", "HIGH", "OPEN", null, 1},
                {"TKT-2026-102", "Validation documents flotte", "Ahmed Abidi", "ROLE_FLEET_OWNER",
                        "ACCOUNT", "MEDIUM", "IN_PROGRESS", "Admin GoRide", 3},
                {"TKT-2026-103", "Comment ajouter un 2ᵉ chauffeur ?", "Ahmed Abidi", "ROLE_FLEET_OWNER",
                        "TECHNICAL", "LOW", "RESOLVED", "Admin GoRide", 10},
                {"TKT-2026-104", "GPS imprécis zone Ariana", "Imed Kilani", "ROLE_DRIVER",
                        "TECHNICAL", "MEDIUM", "OPEN", null, 2},
                {"TKT-2026-105", "Facture entreprise manquante", "Société GoRide", "ROLE_COMPANY",
                        "PAYMENT", "HIGH", "WAITING_USER", "Admin GoRide", 4},
                {"TKT-2026-106", "Mot de passe réinitialisé non reçu", "Amira Gharbi", "ROLE_CLIENT",
                        "ACCOUNT", "MEDIUM", "IN_PROGRESS", null, 0},
                {"TKT-2026-107", "Erreur 500 page réservations", "Karim Mansouri", "ROLE_CLIENT",
                        "TECHNICAL", "HIGH", "OPEN", null, 1},
        };

        int added = 0;
        for (Object[] r : rows) {
            String caseId = (String) r[0];
            if (repo.findByCaseId(caseId).isPresent()) continue;
            int daysAgo = (Integer) r[8];
            LocalDateTime created = now.minusDays(daysAgo);
            repo.save(SupportTicket.builder()
                    .caseId(caseId)
                    .subject((String) r[1])
                    .requesterName((String) r[2])
                    .requesterRole((String) r[3])
                    .category((String) r[4])
                    .priority((String) r[5])
                    .status((String) r[6])
                    .assignedTo((String) r[7])
                    .createdAt(created)
                    .updatedAt(created.plusHours(2))
                    .demoMarker(MARKER)
                    .build());
            added++;
        }
        return added;
    }

    private int seedReports(PlatformReportRepository repo) {
        LocalDateTime now = LocalDateTime.now();
        Object[][] rows = {
                {"REP-2026-201", "Avis 1★ suspect — Peugeot 208", "Avis abusif sans location",
                        "ROLE_CLIENT", "Riadh Landolsi", "ROLE_FLEET_OWNER", "Ahmed Abidi",
                        "REVIEW_ABUSE", "HIGH", "NEW", "REVIEW", "REV-88", null, 1},
                {"REP-2026-202", "Compte doublon même téléphone", "Plusieurs comptes même numéro",
                        "ROLE_ADMIN", "Admin GoRide", "ROLE_USER", "Compte suspect",
                        "USER", "MEDIUM", "IN_REVIEW", "USER", "USR-442", "Admin GoRide", 2},
                {"REP-2026-203", "Excès de vitesse autoroute A1", "Signalement sécurité passager",
                        "ROLE_CLIENT", "Karim Mansouri", "ROLE_DRIVER", "Imed Kilani",
                        "SAFETY", "HIGH", "IN_REVIEW", "TRIP", "TRIP-4521", "Admin GoRide", 0},
                {"REP-2026-204", "Message inapproprié chat location", "Contenu offensant",
                        "ROLE_CLIENT", "Amira Gharbi", "ROLE_FLEET_OWNER", "Ahmed Abidi",
                        "MESSAGE", "MEDIUM", "ACTION_TAKEN", "MESSAGE", "MSG-12", "Admin GoRide", 5},
                {"REP-2026-205", "Photo véhicule non conforme", "Image stock / autre modèle",
                        "ROLE_CLIENT", "Riadh Landolsi", "ROLE_FLEET_OWNER", "Ahmed Abidi",
                        "VEHICLE", "LOW", "CLOSED", "VEHICLE", "VEH-SF-01", "Admin GoRide", 14},
                {"REP-2026-206", "Spam demandes entreprise", "Requêtes répétées identiques",
                        "ROLE_FLEET_OWNER", "Ahmed Abidi", "ROLE_COMPANY", "Société GoRide",
                        "OTHER", "MEDIUM", "NEW", "SERVICE", "SRV-ENT-3", null, 3},
        };

        int added = 0;
        for (Object[] r : rows) {
            String caseId = (String) r[0];
            if (repo.findByCaseId(caseId).isPresent()) continue;
            int daysAgo = (Integer) r[13];
            LocalDateTime created = now.minusDays(daysAgo);
            repo.save(PlatformReport.builder()
                    .caseId(caseId)
                    .title((String) r[1])
                    .reason((String) r[2])
                    .description((String) r[2])
                    .reporterRole((String) r[3])
                    .reporterName((String) r[4])
                    .reportedRole((String) r[5])
                    .reportedName((String) r[6])
                    .reportType((String) r[7])
                    .priority((String) r[8])
                    .status((String) r[9])
                    .relatedEntityType((String) r[10])
                    .relatedServiceId((String) r[11])
                    .assignedTo((String) r[12])
                    .createdAt(created)
                    .updatedAt(created.plusHours(6))
                    .demoMarker(MARKER)
                    .build());
            added++;
        }
        return added;
    }

    private int seedTransactions(TransactionRepository repo, UserRepo userRepo) {
        UserEntity client = userRepo.findByEmail(DataSeeder.EMAIL_CLIENT).orElse(null);
        UserEntity owner = userRepo.findByEmail(DataSeeder.EMAIL_OWNER).orElse(null);
        UserEntity driver = userRepo.findByEmail(DataSeeder.EMAIL_DRIVER).orElse(null);
        UserEntity company = userRepo.findByEmail(DataSeeder.EMAIL_COMPANY).orElse(null);

        // daysAgo répartis sur ~4 semaines pour le graphique « Évolution du CA »
        Object[][] rows = {
                {"TX-DEMO-001", "Location Sfax — Dacia Logan", "RENTAL", 124.0, "PAID", 26, client},
                {"TX-DEMO-002", "Covoiturage Tunis → Sousse", "PASSENGER_PAYMENT", 16.0, "PAID", 22, client},
                {"TX-DEMO-003", "Location Tunis — Peugeot 208", "RENTAL", 116.0, "PAID", 18, client},
                {"TX-DEMO-004", "Commission plateforme — mai 2026", "GORIDE_COMMISSION", 356.0, "PAID", 14, owner},
                {"TX-DEMO-005", "Versement chauffeur semaine", "DRIVER_PAYOUT", 89.0, "PAID", 10, driver},
                {"TX-DEMO-006", "Réservation entreprise Sfax", "COMPANY_PAYMENT", 750.0, "PENDING", 0, company},
                {"TX-DEMO-007", "Course Tunis — La Marsa", "PASSENGER_PAYMENT", 12.0, "PAID", 6, client},
                {"TX-DEMO-008", "Remboursement annulation location Tunis", "REFUND", 58.0, "REFUNDED", 20, client},
                {"TX-DEMO-009", "Recharge portefeuille client", "RECHARGE", 100.0, "PAID", 2, client},
                {"TX-DEMO-010", "Paiement carte refusé", "TRIP", 24.0, "FAILED", 1, client},
                {"TX-DEMO-011", "Location Sousse — Polo", "RENTAL", 150.0, "PENDING", 1, client},
                {"TX-DEMO-012", "Course Sfax → Gabès", "PASSENGER_PAYMENT", 62.0, "PAID", 0, client},
        };

        int added = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Object[] r : rows) {
            String txId = (String) r[0];
            boolean exists = repo.findAll().stream().anyMatch(t -> txId.equals(t.getTransactionId()));
            if (exists) continue;

            int daysAgo = (Integer) r[5];
            UserEntity user = (UserEntity) r[6];
            repo.save(Transaction.builder()
                    .transactionId(txId)
                    .title((String) r[1])
                    .type((String) r[2])
                    .amount((Double) r[3])
                    .status((String) r[4])
                    .user(user)
                    .createdAt(now.minusDays(daysAgo).minusHours(added))
                    .build());
            added++;
        }
        return added;
    }

    /** Paiements / factures pour chaque compte entreprise (page /company/payments). */
    private int seedCompanyPayments(TransactionRepository repo, UserRepo userRepo) {
        int added = 0;
        for (UserEntity company : userRepo.findAll()) {
            if (company.getRoles() == null || company.getRoles().stream()
                    .noneMatch(r -> r.getName() == ERole.ROLE_COMPANY)) {
                continue;
            }
            added += seedPaymentsForCompanyUser(repo, company);
        }
        return added;
    }

    private int seedPaymentsForCompanyUser(TransactionRepository repo, UserEntity company) {
        String prefix = "TX-CORP-" + company.getId() + "-";
        Object[][] rows = {
                {prefix + "01", "Flotte Sfax — 3 véhicules utilitaires", "COMPANY_PAYMENT", 1250.0, "PAID", 18},
                {prefix + "02", "Chauffeurs dédiés — semaine 22", "COMPANY_PAYMENT", 890.0, "PAID", 12},
                {prefix + "03", "Location Peugeot 508 — mission Tunis", "COMPANY_PAYMENT", 420.0, "PAID", 8},
                {prefix + "04", "Réservation flotte été — acompte", "COMPANY_PAYMENT", 750.0, "PENDING", 2},
                {prefix + "05", "Remboursement annulation mission", "REFUND", 120.0, "REFUNDED", 25},
        };

        int added = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Object[] r : rows) {
            String txId = (String) r[0];
            boolean exists = repo.findAll().stream().anyMatch(t -> txId.equals(t.getTransactionId()));
            if (exists) {
                continue;
            }
            int daysAgo = (Integer) r[5];
            repo.save(Transaction.builder()
                    .transactionId(txId)
                    .title((String) r[1])
                    .type((String) r[2])
                    .amount((Double) r[3])
                    .status((String) r[4])
                    .user(company)
                    .createdAt(now.minusDays(daysAgo).minusHours(added))
                    .build());
            added++;
        }
        return added;
    }

    /** Notifications pour chaque compte entreprise (/company/notifications). */
    private int seedCompanyNotifications(NotificationRepository repo, UserRepo userRepo) {
        int added = 0;
        for (UserEntity company : userRepo.findAll()) {
            if (company.getRoles() == null || company.getRoles().stream()
                    .noneMatch(r -> r.getName() == ERole.ROLE_COMPANY)) {
                continue;
            }
            long existing = repo.findByUserIdOrderByCreatedAtDesc(company.getId()).stream()
                    .filter(n -> n.getMessage() != null && n.getMessage().contains(CORP_NOTIF_MARKER))
                    .count();
            if (existing >= 6) {
                continue;
            }
            added += seedNotificationsForCompany(repo, company);
        }
        return added;
    }

    private int seedNotificationsForCompany(NotificationRepository repo, UserEntity company) {
        LocalDateTime now = LocalDateTime.now();
        Object[][] rows = {
                {"Propriétaire accepté — flotte Sfax",
                        CORP_NOTIF_MARKER + " Ahmed Abidi a validé 3 véhicules pour votre mission à Sfax.",
                        "OWNER_ACCEPTED", "/company/requests", 0, false},
                {"Chauffeur assigné — Imed Kilani",
                        CORP_NOTIF_MARKER + " Demande #42 : chauffeur confirmé pour la semaine prochaine.",
                        "DRIVER_ACCEPTED", "/company/requests", 0, false},
                {"Facture en attente — 750 DT",
                        CORP_NOTIF_MARKER + " FAC-2026-204 : acompte flotte été à régler avant le 05/06.",
                        "INVOICE", "/company/payments", 1, false},
                {"Nouveau message — Ahmed Abidi",
                        CORP_NOTIF_MARKER + " « Les véhicules seront disponibles dès 8h demain. »",
                        "MESSAGE", "/company/conversations", 0, false},
                {"Paiement confirmé — 1 250 DT",
                        CORP_NOTIF_MARKER + " Virement reçu pour la location utilitaire Sfax (3 véhicules).",
                        "PAYMENT", "/company/payments", 3, true},
                {"Service terminé — mission Tunis",
                        CORP_NOTIF_MARKER + " Location Peugeot 508 clôturée. Vous pouvez laisser un avis.",
                        "SERVICE_COMPLETED", "/company/reviews", 5, true},
                {"Demande refusée — véhicule indisponible",
                        CORP_NOTIF_MARKER + " Renault Kangoo non disponible aux dates demandées.",
                        "OWNER_REJECTED", "/company/requests", 2, true},
                {"Rappel avis — chauffeur Imed",
                        CORP_NOTIF_MARKER + " Notez votre expérience pour la mission Sfax.",
                        "REVIEW", "/company/reviews", 4, false},
        };

        int added = 0;
        for (Object[] r : rows) {
            String title = (String) r[0];
            boolean exists = repo.findByUserIdOrderByCreatedAtDesc(company.getId()).stream()
                    .anyMatch(n -> title.equals(n.getTitle()));
            if (exists) {
                continue;
            }
            int daysAgo = (Integer) r[4];
            boolean read = (Boolean) r[5];
            repo.save(Notification.builder()
                    .user(company)
                    .title(title)
                    .message((String) r[1])
                    .type((String) r[2])
                    .targetUrl((String) r[3])
                    .isRead(read)
                    .createdAt(now.minusDays(daysAgo).minusHours(added))
                    .build());
            added++;
        }
        return added;
    }

    /** Véhicules en attente de validation admin (carte « À valider » du tableau de bord). */
    private int seedPendingValidations(VehicleRepository repo) {
        int updated = 0;
        for (String plate : List.of("DEMO-BI-001", "DEMO-HA-001")) {
            Optional<Vehicle> opt = repo.findByLicensePlate(plate);
            if (opt.isEmpty()) {
                continue;
            }
            Vehicle v = opt.get();
            if (v.getStatus() == VehicleStatus.MAINTENANCE && !Boolean.TRUE.equals(v.getAvailable())) {
                continue;
            }
            v.setStatus(VehicleStatus.MAINTENANCE);
            v.setAvailable(false);
            repo.save(v);
            updated++;
        }
        return updated;
    }

    private int seedAdminNotifications(NotificationRepository repo, UserEntity admin) {
        LocalDateTime now = LocalDateTime.now();
        // title, message, type (admin UI), targetUrl, daysAgo, isRead
        Object[][] rows = {
                {"Réclamation prioritaire — double débit Sfax",
                        MARKER + " CMP-2026-001 : Riadh Landolsi signale 124 DT prélevés deux fois (Dacia Logan).",
                        "COMPLAINT", "/admin/complaints", 0, false},
                {"Paiement entreprise en attente — 750 DT",
                        MARKER + " TX-DEMO-006 : Société GoRide — réservation flotte Sfax non réglée.",
                        "PAYMENT", "/admin/payments", 0, false},
                {"Signalement sécurité — excès de vitesse A1",
                        MARKER + " REP-2026-203 : Trajet Tunis → Sousse, chauffeur signalé par 2 passagers.",
                        "REPORT", "/admin/reports", 0, false},
                {"Ticket support — D17 refusé",
                        MARKER + " TKT-2026-101 : Riadh Landolsi, paiement carte refusé à la réservation.",
                        "SUPPORT", "/admin/support", 1, false},
                {"Validation véhicule — Peugeot 3008 Bizerte",
                        MARKER + " DEMO-BI-001 : documents assurance à vérifier avant mise en ligne.",
                        "VALIDATION", "/admin/validations", 1, false},
                {"Validation véhicule — Fiat 500 Hammamet",
                        MARKER + " DEMO-HA-001 : contrôle technique expiré, attente scan PDF.",
                        "VALIDATION", "/admin/validations", 2, false},
                {"Facture location Sousse en attente",
                        MARKER + " TX-DEMO-011 : 150 DT — Volkswagen Polo, client Amira Gharbi.",
                        "PAYMENT", "/admin/payments", 1, false},
                {"Réclamation — remboursement non reçu",
                        MARKER + " CMP-2026-004 : 58 DT annulation Tunis, 8 jours sans recrédit.",
                        "COMPLAINT", "/admin/complaints", 3, true},
                {"Nouveau signalement — véhicule sale",
                        MARKER + " REP-2026-205 : Location Sousse, photos jointes par le locataire.",
                        "REPORT", "/admin/reports", 4, true},
                {"Commission plateforme — mai 2026",
                        MARKER + " TX-DEMO-004 : 356 DT commission versée à Ahmed Abidi (flotte).",
                        "PAYMENT", "/admin/payments", 5, true},
                {"Support résolu — ajout 2ᵉ chauffeur",
                        MARKER + " TKT-2026-103 : Ahmed Abidi — procédure documentée, dossier clos.",
                        "SUPPORT", "/admin/support", 10, true},
                {"Système — sauvegarde quotidienne OK",
                        MARKER + " Base H2 / MySQL : sauvegarde automatique terminée avec succès.",
                        "SYSTEM", "/admin/settings", 0, true},
        };
        int added = 0;
        for (Object[] r : rows) {
            int daysAgo = (Integer) r[4];
            boolean read = (Boolean) r[5];
            repo.save(Notification.builder()
                    .user(admin)
                    .title((String) r[0])
                    .message((String) r[1])
                    .type((String) r[2])
                    .targetUrl((String) r[3])
                    .isRead(read)
                    .createdAt(now.minusDays(daysAgo).minusHours(added))
                    .build());
            added++;
        }
        return added;
    }
}
