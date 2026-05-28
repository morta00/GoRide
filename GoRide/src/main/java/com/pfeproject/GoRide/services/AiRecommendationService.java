package com.pfeproject.GoRide.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pfeproject.GoRide.dto.*;
import com.pfeproject.GoRide.entities.Vehicle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(AiRecommendationService.class);

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private TripService tripService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> status() {
        return Map.of(
                "aiEnabled", geminiService.isGeminiActive(),
                "provider", geminiService.isGeminiActive() ? "gemini" : "local"
        );
    }

    public AiRecommendationResponse recommendVehicle(AiVehicleRecommendRequest req) {
        String pref = normalizePreference(req.getPreference());
        List<Vehicle> vehicles = resolveVehiclePool(req);

        if (vehicles.isEmpty()) {
            return emptyResponse(pref, "Aucun véhicule disponible pour le moment.", false);
        }

        if (geminiService.isGeminiActive()) {
            try {
                return recommendVehicleWithGemini(vehicles, req, pref);
            } catch (Exception e) {
                log.warn("[AI] Gemini vehicle recommend failed: {}", e.getMessage());
            }
        }

        return recommendVehicleLocal(vehicles, pref, req.getPassengers());
    }

    public AiRecommendationResponse recommendTrip(AiTripRecommendRequest req) {
        String pref = normalizePreference(req.getPreference());
        List<TripResponseDto> trips = tripService.searchAvailableTrips(req.getDeparture(), req.getDestination());

        if (trips.isEmpty()) {
            return emptyResponse(pref, "Aucun trajet partagé disponible pour ces critères.", false);
        }

        if (geminiService.isGeminiActive()) {
            try {
                return recommendTripWithGemini(trips, req, pref);
            } catch (Exception e) {
                log.warn("[AI] Gemini trip recommend failed: {}", e.getMessage());
            }
        }

        return recommendTripLocal(trips, pref, req.getPassengers());
    }

    public AiRecommendationResponse adviseRide(AiRideAdviceRequest req) {
        String pref = normalizePreference(req.getPreference());
        boolean en = "en".equalsIgnoreCase(req.getLocale());
        // Conseils course : réponses déterministes par préférence (évite réponses génériques type « confort »).
        return adviseRideLocal(req, pref, en);
    }

    private AiRecommendationResponse recommendVehicleWithGemini(
            List<Vehicle> vehicles, AiVehicleRecommendRequest req, String pref) throws Exception {
        boolean en = "en".equalsIgnoreCase(req.getLocale());
        String catalog = objectMapper.writeValueAsString(vehicles.stream().map(this::vehicleSummary).toList());

        String system = en
                ? "You are GoRide's vehicle advisor in Tunisia. Pick the best vehicle id from the JSON list."
                : "Tu es le conseiller véhicules GoRide en Tunisie. Choisis le meilleur id dans la liste JSON.";

        String user = String.format(en
                        ? "Preference: %s (%s). Location: %s. Dates: %s to %s. Passengers: %s. Vehicles: %s"
                        : "Préférence : %s (%s). Lieu : %s. Dates : %s au %s. Passagers : %s. Véhicules : %s",
                pref, preferenceHint(pref, true), nullSafe(req.getLocation()), nullSafe(req.getStartDate()),
                nullSafe(req.getEndDate()), req.getPassengers() != null ? req.getPassengers() : 1, catalog)
                + "\nJSON format: {\"recommendedId\":number,\"headline\":\"...\",\"reason\":\"...\",\"tips\":[\"...\"]}";

        JsonNode json = geminiService.generateJson(system, user);
        return buildFromJson(json, vehicles, null, pref, true);
    }

    private AiRecommendationResponse recommendTripWithGemini(
            List<TripResponseDto> trips, AiTripRecommendRequest req, String pref) throws Exception {
        boolean en = "en".equalsIgnoreCase(req.getLocale());
        String catalog = objectMapper.writeValueAsString(trips.stream().map(this::tripSummary).toList());

        String system = en
                ? "You are GoRide's carpool advisor in Tunisia. Pick the best trip id from the JSON list."
                : "Tu es le conseiller covoiturage GoRide en Tunisie. Choisis le meilleur id de trajet dans la liste JSON.";

        String user = String.format(en
                        ? "Preference: %s (%s). Route hint: %s → %s. Passengers: %s. Trips: %s"
                        : "Préférence : %s (%s). Trajet recherché : %s → %s. Passagers : %s. Trajets : %s",
                pref, preferenceHint(pref, false), nullSafe(req.getDeparture()), nullSafe(req.getDestination()),
                req.getPassengers() != null ? req.getPassengers() : 1, catalog)
                + "\nJSON format: {\"recommendedId\":number,\"headline\":\"...\",\"reason\":\"...\",\"tips\":[\"...\"]}";

        JsonNode json = geminiService.generateJson(system, user);
        return buildFromJson(json, null, trips, pref, true);
    }

    private AiRecommendationResponse adviseRideWithGemini(
            AiRideAdviceRequest req, String pref, boolean en) throws Exception {
        String system = en
                ? "You are GoRide's ride booking advisor in Tunisia. Give practical advice for ordering a private ride."
                : "Tu es le conseiller courses GoRide en Tunisie. Donne des conseils pratiques pour commander une course.";

        String user = String.format(en
                        ? "Preference:%s (%s). From:%s To:%s Type:%s Passengers:%s"
                        : "Préférence:%s (%s). Départ:%s Arrivée:%s Type:%s Passagers:%s",
                pref, preferenceHint(pref, false), nullSafe(req.getDeparture()), nullSafe(req.getDestination()),
                nullSafe(req.getRideType()), req.getPassengers() != null ? req.getPassengers() : 1)
                + "\nJSON: {\"headline\":\"...\",\"reason\":\"...\",\"tips\":[\"...\"]} (no recommendedId needed)";

        JsonNode json = geminiService.generateJson(system, user);
        return AiRecommendationResponse.builder()
                .headline(json.path("headline").asText(en ? "GoRide tip" : "Conseil GoRide"))
                .reason(json.path("reason").asText(""))
                .tips(readTips(json))
                .preference(pref)
                .provider("gemini")
                .aiEnabled(true)
                .build();
    }

    private AiRecommendationResponse recommendVehicleLocal(List<Vehicle> vehicles, String pref, Integer passengers) {
        int pax = passengers != null && passengers > 0 ? passengers : 1;
        Comparator<Vehicle> cmp = switch (pref) {
            case "economy" -> Comparator.comparing(v -> v.getDailyPrice() != null ? v.getDailyPrice() : 9999.0);
            case "family" -> Comparator.comparing((Vehicle v) -> v.getSeats() != null ? v.getSeats() : 0).reversed()
                    .thenComparing(v -> v.getDailyPrice() != null ? v.getDailyPrice() : 9999.0);
            case "eco" -> Comparator.comparingInt((Vehicle v) -> ecoScore(v)).reversed();
            case "long_trip" -> Comparator.comparingInt((Vehicle v) -> longTripScore(v)).reversed();
            case "comfort" -> Comparator.comparingInt((Vehicle v) -> comfortScore(v)).reversed();
            case "flexible" -> Comparator.comparingInt((Vehicle v) -> flexibleVehicleScore(v)).reversed();
            default -> Comparator.comparingInt((Vehicle v) -> comfortScore(v)).reversed();
        };

        Vehicle best = vehicles.stream()
                .filter(v -> v.getSeats() == null || v.getSeats() >= pax)
                .min(cmp)
                .orElse(vehicles.get(0));

        String label = vehicleLabel(best);
        return AiRecommendationResponse.builder()
                .recommendedId(best.getId())
                .recommendedLabel(label)
                .headline(headlineForPreference(pref, true))
                .reason(reasonVehicleLocal(best, pref))
                .tips(tipsVehicleLocal(pref))
                .preference(pref)
                .provider("local")
                .aiEnabled(geminiService.isGeminiActive())
                .build();
    }

    private AiRecommendationResponse recommendTripLocal(List<TripResponseDto> trips, String pref, Integer passengers) {
        int pax = passengers != null && passengers > 0 ? passengers : 1;
        Comparator<TripResponseDto> cmp = switch (pref) {
            case "economy" -> Comparator.comparing(t -> t.getPricePerSeat() != null ? t.getPricePerSeat() : 9999.0);
            case "family" -> Comparator
                    .comparingInt((TripResponseDto t) -> t.getAvailableSeats() != null ? t.getAvailableSeats() : 0).reversed()
                    .thenComparing(t -> t.getPricePerSeat() != null ? t.getPricePerSeat() : 9999.0);
            case "flexible" -> Comparator.comparingInt((TripResponseDto t) -> flexibleTripScore(t)).reversed();
            case "comfort" -> Comparator.comparingInt((TripResponseDto t) -> comfortTripScore(t)).reversed();
            default -> Comparator.comparingInt((TripResponseDto t) -> flexibleTripScore(t)).reversed();
        };

        TripResponseDto best = trips.stream()
                .filter(t -> t.getAvailableSeats() == null || t.getAvailableSeats() >= pax)
                .min(cmp)
                .orElse(trips.get(0));

        return AiRecommendationResponse.builder()
                .recommendedId(best.getId())
                .recommendedLabel(best.getDeparture() + " → " + best.getDestination())
                .headline(headlineForPreference(pref, false))
                .reason(reasonTripLocal(best, pref))
                .tips(tipsTripLocal(pref))
                .preference(pref)
                .provider("local")
                .aiEnabled(geminiService.isGeminiActive())
                .build();
    }

    private AiRecommendationResponse adviseRideLocal(AiRideAdviceRequest req, String pref, boolean en) {
        return AiRecommendationResponse.builder()
                .headline(headlineRideAdvice(pref, en))
                .reason(reasonRideAdvice(pref, en))
                .tips(en ? tipsRideEn(pref) : tipsRideFr(pref))
                .preference(pref)
                .provider("local")
                .aiEnabled(geminiService.isGeminiActive())
                .build();
    }

    private String headlineRideAdvice(String pref, boolean en) {
        return switch (pref) {
            case "economy" -> en ? "Economical ride" : "Course économique";
            case "family" -> en ? "Ride for your group" : "Course pour groupe";
            case "flexible" -> en ? "Flexible ride" : "Course flexible";
            case "comfort" -> en ? "Comfortable ride" : "Course confortable";
            default -> en ? "Tip for your ride" : "Conseil pour votre course";
        };
    }

    private String reasonRideAdvice(String pref, boolean en) {
        return switch (pref) {
            case "economy" -> en
                    ? "Choose a shared/collaborative ride type when available and avoid peak hours."
                    : "Privilégiez le type collaboratif si disponible et évitez les heures de pointe.";
            case "family" -> en
                    ? "Specify passenger count and luggage in your request so the driver can prepare."
                    : "Indiquez le nombre de passagers et les bagages pour que le chauffeur s'organise.";
            case "flexible" -> en
                    ? "For flexibility, add a time window in the notes and stay reachable for small schedule changes."
                    : "Pour la flexibilité, précisez une plage horaire dans les notes et restez joignable pour un léger changement d'horaire.";
            case "comfort" -> en
                    ? "For comfort, prefer an individual ride and mention AC or luggage needs in the request."
                    : "Pour le confort, choisissez une course individuelle et mentionnez climatisation ou bagages si besoin.";
            default -> en
                    ? "Adapt the ride type and options to your priority."
                    : "Adaptez le type de course et les options à votre priorité.";
        };
    }

    private AiRecommendationResponse buildFromJson(
            JsonNode json, List<Vehicle> vehicles, List<TripResponseDto> trips, String pref, boolean gemini) {
        Long id = json.has("recommendedId") && !json.get("recommendedId").isNull()
                ? json.get("recommendedId").asLong() : null;

        String label = null;
        if (id != null && vehicles != null) {
            label = vehicles.stream().filter(v -> v.getId().equals(id)).findFirst()
                    .map(this::vehicleLabel).orElse(null);
        }
        if (id != null && trips != null && label == null) {
            label = trips.stream().filter(t -> t.getId().equals(id)).findFirst()
                    .map(t -> t.getDeparture() + " → " + t.getDestination()).orElse(null);
        }

        return AiRecommendationResponse.builder()
                .recommendedId(id)
                .recommendedLabel(label)
                .headline(json.path("headline").asText(headlineForPreference(pref, vehicles != null)))
                .reason(json.path("reason").asText(""))
                .tips(readTips(json))
                .preference(pref)
                .provider(gemini ? "gemini" : "local")
                .aiEnabled(gemini)
                .build();
    }

    private List<Vehicle> resolveVehiclePool(AiVehicleRecommendRequest req) {
        String brandQ = req.getBrand() != null && !req.getBrand().isBlank() ? req.getBrand().trim() : null;
        List<Vehicle> vehicles = vehicleService.searchAvailableVehicles(
                brandQ, req.getLocation(), null, req.getMaxPrice());

        if (req.getTransmission() != null && !req.getTransmission().isBlank()) {
            String tr = req.getTransmission().trim();
            vehicles = vehicles.stream()
                    .filter(v -> v.getTransmission() != null && tr.equalsIgnoreCase(v.getTransmission()))
                    .toList();
        }
        if (req.getVehicleIds() != null && !req.getVehicleIds().isEmpty()) {
            Set<Long> ids = new HashSet<>(req.getVehicleIds());
            vehicles = vehicles.stream()
                    .filter(v -> v.getId() != null && ids.contains(v.getId()))
                    .toList();
        }
        return vehicles;
    }

    private Map<String, Object> vehicleSummary(Vehicle v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId());
        m.put("name", v.getBrand() + " " + v.getModel());
        m.put("category", v.getCategory());
        m.put("dailyPrice", v.getDailyPrice());
        m.put("seats", v.getSeats());
        m.put("transmission", v.getTransmission());
        m.put("fuelType", v.getFuelType());
        m.put("location", v.getLocation());
        m.put("rating", v.getRating());
        return m;
    }

    private Map<String, Object> tripSummary(TripResponseDto t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("departure", t.getDeparture());
        m.put("destination", t.getDestination());
        m.put("departureTime", t.getDepartureTime());
        m.put("pricePerSeat", t.getPricePerSeat());
        m.put("availableSeats", t.getAvailableSeats());
        m.put("driver", t.getDriverName());
        m.put("vehicle", t.getVehicleName());
        return m;
    }

    private int comfortScore(Vehicle v) {
        int score = 0;
        String cat = v.getCategory() != null ? v.getCategory().toLowerCase() : "";
        if (cat.contains("luxe")) score += 40;
        if (cat.contains("suv") || cat.contains("confort")) score += 25;
        if (cat.contains("compact")) score += 8;
        if ("Automatique".equalsIgnoreCase(v.getTransmission())) score += 20;
        if (v.getRating() != null) score += (int) (v.getRating() * 12);
        if (Boolean.TRUE.equals(v.getHasAC())) score += 10;
        return score;
    }

    /** Autoroute / longue distance : coffre, SUV, motorisation endurance. */
    private int longTripScore(Vehicle v) {
        int score = comfortScore(v) / 2;
        String cat = v.getCategory() != null ? v.getCategory().toLowerCase() : "";
        if (cat.contains("suv")) score += 35;
        String fuel = v.getFuelType() != null ? v.getFuelType().toLowerCase() : "";
        if (fuel.contains("diesel") || fuel.contains("hybr")) score += 25;
        if (v.getLuggageCapacity() != null && v.getLuggageCapacity() >= 3) score += 20;
        if (v.getMileage() != null && v.getMileage() < 80000) score += 10;
        return score;
    }

    /** Bon compromis : prix modéré + disponibilité + polyvalence (pas luxe pur). */
    private int flexibleVehicleScore(Vehicle v) {
        int score = 50;
        double price = v.getDailyPrice() != null ? v.getDailyPrice() : 120;
        if (price >= 60 && price <= 110) score += 30;
        if (price < 60) score += 15;
        if (price > 130) score -= 15;
        if (v.getSeats() != null && v.getSeats() >= 5) score += 10;
        if ("Automatique".equalsIgnoreCase(v.getTransmission())) score += 8;
        return score;
    }

    private int comfortTripScore(TripResponseDto t) {
        int score = 0;
        if (t.getDriverRating() != null) score += (int) (t.getDriverRating() * 25);
        if (t.getPricePerSeat() != null) score += Math.min(20, (int) (t.getPricePerSeat() * 1.5));
        String vehicle = t.getVehicleName() != null ? t.getVehicleName().toLowerCase() : "";
        if (vehicle.contains("suv") || vehicle.contains("3008") || vehicle.contains("sportage")) score += 15;
        return score;
    }

    private int flexibleTripScore(TripResponseDto t) {
        int score = 0;
        if (t.getAvailableSeats() != null) score += t.getAvailableSeats() * 12;
        if (t.getDepartureTime() != null) {
            long hours = Duration.between(LocalDateTime.now(), t.getDepartureTime()).toHours();
            if (hours >= 0 && hours <= 24) score += 35;
            else if (hours <= 72) score += 22;
            else if (hours <= 168) score += 10;
        }
        if (t.getPricePerSeat() != null && t.getPricePerSeat() <= 22) score += 10;
        return score;
    }

    private int ecoScore(Vehicle v) {
        String fuel = v.getFuelType() != null ? v.getFuelType().toLowerCase() : "";
        if (fuel.contains("élect") || fuel.contains("elect") || fuel.contains("hybr")) return 100;
        if (fuel.contains("diesel")) return 40;
        return 20;
    }

    private String vehicleLabel(Vehicle v) {
        return v.getBrand() + " " + v.getModel();
    }

    private String normalizePreference(String p) {
        if (p == null || p.isBlank()) return "comfort";
        return p.toLowerCase(Locale.ROOT).trim();
    }

    private String nullSafe(String s) {
        return s != null ? s : "";
    }

    private List<String> readTips(JsonNode json) {
        List<String> tips = new ArrayList<>();
        JsonNode arr = json.path("tips");
        if (arr.isArray()) {
            arr.forEach(n -> {
                if (!n.asText().isBlank()) tips.add(n.asText());
            });
        }
        return tips;
    }

    private AiRecommendationResponse emptyResponse(String pref, String reason, boolean ai) {
        return AiRecommendationResponse.builder()
                .headline("Aucune recommandation")
                .reason(reason)
                .preference(pref)
                .provider(ai ? "gemini" : "local")
                .aiEnabled(ai)
                .build();
    }

    private String headlineForPreference(String pref, boolean vehicle) {
        return switch (pref) {
            case "economy" -> vehicle ? "Meilleur rapport qualité-prix" : "Trajet le plus économique";
            case "family" -> vehicle ? "Idéal pour la famille" : "Plus de places disponibles";
            case "eco" -> "Choix éco-responsable";
            case "long_trip" -> "Confort pour longue distance";
            case "comfort" -> vehicle ? "Confort et sérénité" : "Trajet le plus confortable";
            case "flexible" -> vehicle ? "Équilibre flexible" : "Horaires et places souples";
            default -> vehicle ? "Notre meilleur choix" : "Trajet recommandé";
        };
    }

    private String reasonVehicleLocal(Vehicle v, String pref) {
        return switch (pref) {
            case "economy" -> v.getBrand() + " " + v.getModel() + " — à partir de "
                    + (v.getDailyPrice() != null ? v.getDailyPrice().intValue() : "?") + " DT/jour, catégorie économique.";
            case "family" -> v.getBrand() + " " + v.getModel() + " offre "
                    + (v.getSeats() != null ? v.getSeats() : "?") + " places pour voyager sereinement.";
            case "eco" -> "Motorisation " + (v.getFuelType() != null ? v.getFuelType() : "efficiente")
                    + " pour réduire la consommation.";
            case "long_trip" -> v.getBrand() + " " + v.getModel() + " — idéal autoroute ("
                    + (v.getCategory() != null ? v.getCategory() : "SUV/berline")
                    + ", " + (v.getFuelType() != null ? v.getFuelType() : "diesel/hybride") + ").";
            case "comfort" -> v.getBrand() + " " + v.getModel() + " — catégorie "
                    + (v.getCategory() != null ? v.getCategory() : "confort")
                    + ", transmission " + (v.getTransmission() != null ? v.getTransmission() : "automatique")
                    + ", note " + (v.getRating() != null ? String.format(Locale.ROOT, "%.1f", v.getRating()) : "—") + ".";
            case "flexible" -> v.getBrand() + " " + v.getModel() + " — bon compromis prix ("
                    + (v.getDailyPrice() != null ? v.getDailyPrice().intValue() : "?") + " DT/jour) et polyvalence.";
            default -> v.getBrand() + " " + v.getModel() + " — bon équilibre confort, "
                    + (v.getCategory() != null ? v.getCategory() : "véhicule") + " et équipements.";
        };
    }

    private String reasonTripLocal(TripResponseDto t, String pref) {
        return switch (pref) {
            case "economy" -> "Trajet " + t.getDeparture() + " → " + t.getDestination()
                    + " à " + (t.getPricePerSeat() != null ? t.getPricePerSeat().intValue() : "?") + " DT/place — le moins cher.";
            case "family" -> t.getAvailableSeats() + " place(s) restante(s) — idéal pour voyager en groupe.";
            case "comfort" -> "Trajet " + t.getDeparture() + " → " + t.getDestination()
                    + " avec chauffeur bien noté"
                    + (t.getDriverRating() != null ? " (" + String.format(Locale.ROOT, "%.1f", t.getDriverRating()) + "/5)" : "")
                    + (t.getVehicleName() != null ? ", véhicule " + t.getVehicleName() : "") + ".";
            case "flexible" -> "Départ le "
                    + (t.getDepartureTime() != null ? t.getDepartureTime().toLocalDate() : "?")
                    + " — encore " + (t.getAvailableSeats() != null ? t.getAvailableSeats() : "?")
                    + " place(s), facile à rejoindre.";
            default -> "Départ " + (t.getDepartureTime() != null
                    ? t.getDepartureTime().toLocalDate() : "") + ", bon compromis horaire et prix.";
        };
    }

    private List<String> tipsVehicleLocal(String pref) {
        return switch (pref) {
            case "economy" -> List.of("Réservez tôt pour bloquer le meilleur tarif.", "Vérifiez la caution indiquée sur la fiche.");
            case "family" -> List.of("Prévoyez un siège enfant si besoin (message au propriétaire).", "Choisissez un lieu de prise en charge spacieux.");
            case "eco" -> List.of("Hybride ou électrique : idéal en ville.", "Roulez à vitesse stable pour maximiser l'autonomie.");
            case "long_trip" -> List.of("Privilégiez automatique et diesel/hybride.", "Planifiez des pauses toutes les 2 h.");
            case "comfort" -> List.of("Vérifiez climatisation et catégorie Luxe/SUV.", "Comparez la note des véhicules similaires.");
            case "flexible" -> List.of("Idéal si vos dates peuvent légèrement changer.", "Comparez le prix/jour avec la durée réelle de location.");
            default -> List.of("Comparez 2–3 véhicules avant de confirmer.", "Lisez les avis et le niveau de confort (catégorie).");
        };
    }

    private List<String> tipsTripLocal(String pref) {
        return switch (pref) {
            case "economy" -> List.of("Réservez dès que possible — les places bon marché partent vite.", "Arrivez 5 min avant l'heure de départ.");
            case "family" -> List.of("Indiquez le nombre exact de passagers à la réservation.", "Contactez le chauffeur via Messages si bagages volumineux.");
            case "comfort" -> List.of("Lisez la note du chauffeur et le type de véhicule.", "Prévoyez un point de rendez-vous précis pour plus de confort.");
            case "flexible" -> List.of("Choisissez un départ proche dans le temps si vos plans bougent.", "Plus il reste de places, plus c'est simple de réserver.");
            default -> List.of("Vérifiez le point de rendez-vous avec le chauffeur.", "Paiement en espèces sauf indication contraire.");
        };
    }

    private List<String> tipsRideFr(String pref) {
        return switch (pref) {
            case "economy" -> List.of("Type collaboratif si disponible pour partager les frais.", "Évitez les heures de pointe si possible.");
            case "comfort" -> List.of("Course individuelle pour plus d'intimité.", "Ajoutez vos extras (bagages, climatisation) dans la demande.");
            case "flexible" -> List.of("Indiquez une plage horaire dans les notes si possible.", "Le chauffeur peut proposer un léger ajustement d'horaire.");
            case "family" -> List.of("Précisez le nombre de passagers et bagages.", "Vérifiez la capacité du véhicule du chauffeur.");
            default -> List.of("Soyez précis sur l'adresse de prise en charge.", "Suivez le chauffeur dans « Course en cours » après acceptation.");
        };
    }

    private String preferenceHint(String pref, boolean vehicle) {
        return switch (pref) {
            case "economy" -> vehicle
                    ? "lowest daily price"
                    : "cheapest seat";
            case "family" -> vehicle
                    ? "max seats for passengers"
                    : "most available seats for group";
            case "eco" -> "hybrid/electric, low consumption";
            case "long_trip" -> "highway comfort, SUV, diesel/hybrid, luggage";
            case "comfort" -> vehicle
                    ? "premium category, automatic, high rating, AC"
                    : "best driver rating and comfortable vehicle, not cheapest";
            case "flexible" -> vehicle
                    ? "mid price, versatile, not luxury-focused"
                    : "soon departure + many seats left, easy to book";
            default -> "balanced choice";
        };
    }

    private List<String> tipsRideEn(String pref) {
        return switch (pref) {
            case "economy" -> List.of("Use collaborative ride type if available.", "Avoid rush hours when possible.");
            case "family" -> List.of("State exact passenger count and luggage.", "Check vehicle capacity with the driver.");
            case "flexible" -> List.of("Add a time window in the notes.", "Stay reachable for small schedule adjustments.");
            case "comfort" -> List.of("Individual ride for more privacy.", "Mention AC or luggage in the request.");
            default -> List.of("Be precise with pickup address.", "Track your driver after acceptance.");
        };
    }

    private String prefLabelFr(String pref) {
        return switch (pref) {
            case "economy" -> "économie";
            case "family" -> "famille";
            case "eco" -> "écologie";
            case "long_trip" -> "long trajet";
            case "flexible" -> "flexibilité horaire et places";
            case "comfort" -> "confort premium";
            default -> "confort";
        };
    }
}
