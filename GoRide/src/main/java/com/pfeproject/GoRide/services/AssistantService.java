package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.AssistantChatMessage;
import com.pfeproject.GoRide.dto.AssistantChatResponse;
import com.pfeproject.GoRide.entities.Trip;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.entities.VehicleStatus;
import com.pfeproject.GoRide.repositories.TripRepository;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
@Service
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);

    private static final String SYSTEM_PROMPT_FR = """
            Tu es **l'assistant GoRide**, conseiller mobilité expert en Tunisie, propulsé par **Google Gemini**.
            Tu raisonnes sur le besoin réel de l'utilisateur (budget, ville, dates, nombre de personnes, type de trajet) avant de répondre.
            
            COMPORTEMENT INTELLIGENT :
            - Réponds en **français**, ton naturel, chaleureux et expert (comme un conseiller humain, pas un robot).
            - Utilise l'**historique** de la conversation : ne répète pas, fais référence aux messages précédents si utile.
            - Structure avec **markdown léger** : titres courts, listes à puces, **gras** pour l'essentiel.
            - Pour une recommandation voiture : compare 1 à 3 options **réelles** de « VÉHICULES DISPONIBLES » avec prix DT/jour, ville, places, transmission — et explique **pourquoi** chaque choix convient.
            - Propose la **meilleure option** GoRide : location longue durée vs covoiturage vs chauffeur selon le cas.
            - Questions « comment utiliser l'app », « que faire », « combien de voitures » : utilise le GUIDE PLATEFORME + STATISTIQUES (chiffres exacts).
            - **Ne jamais** afficher d'e-mails, mots de passe, comptes démo ou identifiants admin dans les guides d'utilisation — indique seulement « Connexion » / « S'inscrire » et les menus. Les identifiants ne sont donnés que si l'utilisateur demande explicitement « comptes de test » ou « identifiants démo ».
            - Entreprise : louer via **Demander un service** ou **Louer un véhicule** ; propriétaire voit les demandes dans **Demandes de location**.
            - Hors sujet (football, tennis, météo, politique, jeux…) : dis clairement que GoRide est une app de **location / covoiturage / chauffeur**, pas pour ce sujet — ne réponds pas à la question.
            - Ne invente **jamais** de véhicule ou trajet absent des listes ci-dessous. Si liste vide, dis-le et suggère de redémarrer le backend (profil H2).
            - « Comment utiliser l'app » : réponse **courte et ciblée** (max 8–10 lignes), pas un manuel complet pour tous les rôles — propose de détailler selon le rôle de l'utilisateur.
            - Ne répète pas les statistiques plateforme sauf si on demande « combien de ».
            """ + AssistantPlatformKnowledge.SYSTEM_APPENDIX_FR;

    private static final String SYSTEM_PROMPT_EN = """
            You are **GoRide's assistant**, an expert mobility advisor in Tunisia, powered by **Google Gemini**.
            Reason about the user's real need (budget, city, dates, passengers, trip type) before answering.
            
            INTELLIGENT BEHAVIOR:
            - Reply in **English**, natural warm expert tone (human advisor, not a generic bot).
            - Use **conversation history**; reference prior messages when helpful; do not repeat boilerplate.
            - Use light **markdown**: short headings, bullet lists, **bold** for key points.
            - For car advice: compare 1–3 **real** options from « AVAILABLE VEHICLES » with TND/day, city, seats — explain **why** each fits.
            - Suggest the best GoRide mode: rental vs carpool vs driver booking when relevant.
            - App usage / stats questions: use PLATFORM GUIDE + exact STATS numbers.
            - **Never** show emails, passwords, demo accounts, or admin credentials in usage guides — only mention Login / Sign up and menus. Give credentials only if the user explicitly asks for « demo accounts » or « test login ».
            - Off-topic (football, tennis, weather, politics, games…): state clearly GoRide is for **rentals / carpool / drivers** only — do not answer that topic.
            - Never invent vehicles or trips not in the lists below.
            - « How to use the app »: **short targeted** answer (max 8–10 lines), not a full manual for every role — offer to detail based on user's role.
            - Do not repeat platform stats unless the user asked « how many ».
            """ + AssistantPlatformKnowledge.SYSTEM_APPENDIX_EN;

    @Value("${goride.ai.provider:local}")
    private String provider;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private AssistantSmartReplyService smartReplyService;

    public AssistantChatResponse chat(String userMessage, String locale, List<AssistantChatMessage> history) {
        String msg = userMessage != null ? userMessage.trim() : "";
        if (msg.isEmpty()) {
            return buildReply(emptyPrompt(locale), "local", false);
        }

        boolean en = "en".equalsIgnoreCase(locale);
        List<AssistantChatMessage> safeHistory = history != null ? history : List.of();

        AssistantIntentDetector.Intent intent = AssistantIntentDetector.detect(msg);

        if (intent == AssistantIntentDetector.Intent.OFF_TOPIC) {
            return buildReply(smartReplyService.offTopicReply(en), shouldUseGemini() ? "gemini" : "smart", shouldUseGemini());
        }

        if (shouldUseGemini()) {
            try {
                String system = (en ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR)
                        + buildContextForIntent(en, intent);
                String reply = geminiService.chat(system, msg, trimHistory(safeHistory));
                return buildReply(AssistantResponseSanitizer.sanitize(reply), "gemini", true);
            } catch (Exception e) {
                log.error("[Assistant] Gemini failed (full context): {}", e.getMessage());
                try {
                    String slimSystem = (en ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR) + buildStatsContextOnly(en);
                    String reply = geminiService.chat(slimSystem, msg, trimHistory(safeHistory));
                    return buildReply(AssistantResponseSanitizer.sanitize(reply), "gemini", true);
                } catch (Exception e2) {
                    log.error("[Assistant] Gemini retry failed: {}", e2.getMessage());
                }
            }
        }

        if (!geminiService.hasApiKey()) {
            log.warn("[Assistant] No Gemini API key in application-local.properties");
        }
        return buildReply(
                AssistantResponseSanitizer.sanitize(smartReplyService.reply(msg, en)),
                "smart",
                false);
    }

    private String buildContextForIntent(boolean en, AssistantIntentDetector.Intent intent) {
        if (AssistantIntentDetector.needsFullVehicleCatalog(intent)) {
            return buildLiveContext(en);
        }
        return buildStatsContextOnly(en);
    }

    private String buildStatsContextOnly(boolean en) {
        try {
            List<Vehicle> vehicles = vehicleRepository.findByAvailableTrueAndStatus(VehicleStatus.AVAILABLE);
            List<Trip> trips = tripRepository.findAvailableTrips(LocalDateTime.now());
            long total = vehicleRepository.count();
            if (en) {
                return String.format("\n\n[LIVE STATS] %d rentable vehicles | %d total | %d open carpool trips\n",
                        vehicles.size(), total, trips.size());
            }
            return String.format("\n\n[STATS] %d véhicules louables | %d au catalogue | %d trajets covoiturage\n",
                    vehicles.size(), total, trips.size());
        } catch (Exception e) {
            return "";
        }
    }

    /** Use Google Gemini whenever a key is configured (gemini, auto, or any non-local provider). */
    private boolean shouldUseGemini() {
        if (!geminiService.hasApiKey()) {
            return false;
        }
        String p = provider != null ? provider.trim().toLowerCase(Locale.ROOT) : "auto";
        return !"local".equals(p) && !"smart".equals(p) && !"rules".equals(p);
    }

    private boolean isQuotaError(Exception e) {
        String m = e.getMessage();
        return m != null && (m.contains("429") || m.toLowerCase(Locale.ROOT).contains("quota")
                || m.toLowerCase(Locale.ROOT).contains("too many"));
    }

    public Map<String, Object> status() {
        boolean geminiOn = shouldUseGemini();
        return Map.of(
                "provider", geminiOn ? "gemini" : provider,
                "geminiConfigured", geminiOn,
                "geminiKeyPresent", geminiService.hasApiKey(),
                "geminiModel", geminiService.getActiveModelName(),
                "mode", geminiOn ? "gemini" : "smart"
        );
    }

    private List<AssistantChatMessage> trimHistory(List<AssistantChatMessage> history) {
        int max = 20;
        if (history.size() <= max) {
            return history;
        }
        return history.subList(history.size() - max, history.size());
    }

    private String buildLiveContext(boolean en) {
        StringBuilder sb = new StringBuilder();
        try {
            List<Vehicle> vehicles = vehicleRepository.findByAvailableTrueAndStatus(VehicleStatus.AVAILABLE);
            List<Trip> trips = tripRepository.findAvailableTrips(LocalDateTime.now());
            long totalVehicles = vehicleRepository.count();
            if (en) {
                sb.append("\n\n--- PLATFORM STATS (use for « how many » questions) ---\n");
                sb.append(String.format("Rentable vehicles now: %d | Total catalog: %d | Open carpool trips: %d\n",
                        vehicles.size(), totalVehicles, trips.size()));
            } else {
                sb.append("\n\n--- STATISTIQUES PLATEFORME (pour « combien de… ») ---\n");
                sb.append(String.format("Véhicules louables : %d | Catalogue total : %d | Trajets covoiturage ouverts : %d\n",
                        vehicles.size(), totalVehicles, trips.size()));
            }

            if (en) {
                sb.append("\n\n--- AVAILABLE VEHICLES (live data) ---\n");
            } else {
                sb.append("\n\n--- VÉHICULES DISPONIBLES (données en direct) ---\n");
            }
            if (vehicles.isEmpty()) {
                sb.append(en ? "(none — backend may need restart with H2 profile)\n" : "(aucun — redémarrer le backend profil h2)\n");
            } else {
                vehicles.stream().limit(30).forEach(v -> sb.append(formatVehicleLine(v, en)).append('\n'));
            }

            if (en) {
                sb.append("\n--- CARPOOL TRIPS ---\n");
            } else {
                sb.append("\n--- TRAJETS COVOITURAGE ---\n");
            }
            if (trips.isEmpty()) {
                sb.append(en ? "(no upcoming trips)\n" : "(aucun trajet à venir)\n");
            } else {
                trips.stream().limit(15).forEach(t -> sb.append(formatTripLine(t, en)).append('\n'));
            }
        } catch (Exception e) {
            log.warn("[Assistant] Could not load live context: {}", e.getMessage());
            sb.append(en ? "\n(Live catalog unavailable)\n" : "\n(Catalogue indisponible)\n");
        }
        return sb.toString();
    }

    private String formatVehicleLine(Vehicle v, boolean en) {
        String price = v.getDailyPrice() != null ? String.format("%.0f", v.getDailyPrice()) : "?";
        String cat = v.getCategory() != null ? v.getCategory() : "-";
        String loc = v.getLocation() != null ? v.getLocation() : "Tunis";
        String trans = v.getTransmission() != null ? v.getTransmission() : "-";
        String fuel = v.getFuelType() != null ? v.getFuelType() : "-";
        int seats = v.getSeats() != null ? v.getSeats() : 5;
        if (en) {
            return String.format("- %s %s | %s | %s seats | %s | %s | %s TND/day | %s | rating %.1f",
                    v.getBrand(), v.getModel(), v.getLicensePlate(), seats, trans, fuel, price, loc,
                    v.getRating() != null ? v.getRating() : 4.5);
        }
        return String.format("- %s %s | %s | %d places | %s | %s | %s DT/jour | cat. %s | %s | note %.1f",
                v.getBrand(), v.getModel(), v.getLicensePlate(), seats, trans, fuel, price, cat, loc,
                v.getRating() != null ? v.getRating() : 4.5);
    }

    private String formatTripLine(Trip t, boolean en) {
        String price = t.getPricePerSeat() != null ? String.format("%.0f", t.getPricePerSeat()) : "?";
        if (en) {
            return String.format("- %s → %s | %s seats left | %s TND/seat | departs %s",
                    t.getDeparture(), t.getDestination(), t.getAvailableSeats(), price, t.getDepartureTime());
        }
        return String.format("- %s → %s | %d places | %s DT/place | départ %s",
                t.getDeparture(), t.getDestination(), t.getAvailableSeats(), price, t.getDepartureTime());
    }

    private AssistantChatResponse buildReply(String reply, String prov, boolean aiEnabled) {
        return AssistantChatResponse.builder()
                .reply(AssistantResponseSanitizer.sanitize(reply))
                .provider(prov)
                .aiEnabled(aiEnabled)
                .build();
    }

    private String emptyPrompt(String locale) {
        return "en".equalsIgnoreCase(locale)
                ? "Ask me anything about GoRide — I'll recommend real cars from our fleet."
                : "Posez votre question sur GoRide — je recommanderai des véhicules réels de la flotte.";
    }

    private String shortError(Exception e) {
        String m = e.getMessage();
        return m == null ? "error" : (m.length() > 120 ? m.substring(0, 120) + "…" : m);
    }

}
