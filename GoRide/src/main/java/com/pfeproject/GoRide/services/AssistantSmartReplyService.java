package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.entities.Trip;
import com.pfeproject.GoRide.entities.Vehicle;
import com.pfeproject.GoRide.repositories.TripRepository;
import com.pfeproject.GoRide.repositories.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Data-driven assistant replies when Gemini is unavailable (quota, offline, etc.).
 * Uses real vehicles and trips from the database — never generic boilerplate.
 */
@Service
public class AssistantSmartReplyService {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private TripRepository tripRepository;

    public String reply(String userMessage, boolean english) {
        String msg = userMessage != null ? userMessage.trim() : "";
        if (msg.isEmpty()) {
            return english
                    ? "Ask me about cars for a family trip, Tunis → Sfax routes, or carpool options."
                    : "Demandez une voiture pour la famille, un trajet Tunis → Sfax, ou le covoiturage.";
        }

        String m = msg.toLowerCase(Locale.ROOT);
        List<Vehicle> vehicles = vehicleRepository.findByAvailableTrueAndStatus(
                com.pfeproject.GoRide.entities.VehicleStatus.AVAILABLE);
        List<Trip> trips = tripRepository.findAvailableTrips(LocalDateTime.now());

        int totalVehicles = (int) vehicleRepository.count();
        if (isPlatformStatsQuestion(m)) {
            return AssistantPlatformKnowledge.platformStatsReply(
                    vehicles.size(), trips.size(), totalVehicles, english);
        }
        if (isHowToUsePlatformQuestion(m)) {
            return AssistantPlatformKnowledge.howToUsePlatformReply(english);
        }
        if (isCapabilitiesOrHelpQuestion(m)) {
            return AssistantPlatformKnowledge.capabilitiesReplyShort(
                    english, vehicles.size(), trips.size());
        }
        if (AssistantIntentDetector.isOffTopic(m) || isClearlyOffTopic(m)) {
            return offTopicReply(english);
        }
        if (isFamilyCarQuestion(m)) {
            return familyCarReply(vehicles, english);
        }
        if (isRouteOrCarpoolQuestion(m)) {
            return routeAndCarpoolReply(m, vehicles, trips, english);
        }
        if (isCarRecommendation(m)) {
            return generalCarReply(vehicles, english);
        }
        if (isGreetingOnly(m)) {
            return greetingWithHints(vehicles, trips, english);
        }
        if (containsAny(m, "comment", "how", "utilis", "guide", "menu", "plateforme", "application", "app")) {
            return AssistantPlatformKnowledge.howToUsePlatformReply(english);
        }

        if (!isGoRideRelated(m)) {
            return offTopicReply(english);
        }

        return generalHelpReply(vehicles, trips, english);
    }

    /** How to use the app / platform — always in scope. */
    private boolean isHowToUsePlatformQuestion(String m) {
        if (isCapabilitiesOrHelpQuestion(m) && containsAny(m, "utiliser", "utilise", "application", "plateforme",
                "platform", "app ", " l'app", "comment je", "comment on", "how to use", "how do i use",
                "use the app", "use this app", "guide", "tutoriel", "premiers pas", "démarrer", "demarrer",
                "commencer", "menus", "navigation", "étapes", "etapes", "fonctionne", "marche")) {
            return true;
        }
        return containsAny(m,
                "comment utiliser", "comment je peux", "comment je peut", "comment utiliser l",
                "utiliser l'application", "utiliser cette application", "utiliser la plateforme",
                "utiliser goride", "how to use the app", "how to use this", "how do i use",
                "comment ça marche", "comment ca marche", "guide d'utilisation", "guide utilisateur",
                "que faire sur", "what to do on", "how does the app", "how does goride");
    }

    private boolean isPlatformStatsQuestion(String m) {
        return containsAny(m,
                "combien de voiture", "combien de véhicule", "combien de vehicule", "combien de trajet",
                "combien de trajets", "combien de covoiturage", "combien voiture", "combien véhicule",
                "how many car", "how many vehicle", "how many trip", "how many trips",
                "nombre de voitures", "nombre de véhicules", "nombre de trajets",
                "véhicules disponibles", "voitures disponibles", "trajets disponibles",
                "cars available", "trips available", "statistiques", "stats goride", "stats plateforme",
                "données en direct", "live data", "en ce moment sur goride");
    }

    /** Meta questions: role, features, what the bot can do — not car listings. */
    private boolean isCapabilitiesOrHelpQuestion(String m) {
        if (containsAny(m,
                "que peux-tu", "qu'est-ce que tu", "qu est ce que tu", "à quoi tu sers", "a quoi tu sers",
                "que puis-je", "que puis je", "qu'est-ce que je peux", "qu est ce que je peux",
                "quoi faire", "faire ici", "faire sur", "faire dans", "faire avec goride",
                "what can you do", "what can i do", "what do you do", "who are you", "how can you help",
                "your capabilities", "what can i do here", "what can i do on",
                "tes capacités", "tes capacites", "comment tu fonctionnes",
                "tu fais quoi", "tu peux faire", "peux-tu faire", "peux tu faire", "pour moi sur",
                "fonctionnalités", "fonctionnalites", "features of", "help with goride", "aide goride",
                "c'est quoi goride", "c est quoi goride", "what is goride", "présente-toi", "presente toi",
                "que faire sur goride", "services de goride", "what does goride",
                "sur la plateforme", "on the platform", "dans l'app", "dans l app", "sur goride",
                "utiliser goride", "à quoi sert", "a quoi sert")) {
            return true;
        }
        // « Que puis-je faire ? » / « What can I do? » without naming GoRide
        if ((m.contains("que puis") || m.contains("what can i do") || m.contains("quoi faire"))
                && (m.contains("faire") || m.contains("do"))) {
            return true;
        }
        return false;
    }

    /** Meta / platform questions — answer locally before Gemini (avoids false "out of scope"). */
    public boolean isMetaPlatformQuestion(String m) {
        if (m == null || m.isBlank()) {
            return false;
        }
        String lower = m.toLowerCase(Locale.ROOT);
        return isPlatformStatsQuestion(lower) || isHowToUsePlatformQuestion(lower)
                || isCapabilitiesOrHelpQuestion(lower);
    }

    private boolean isClearlyOffTopic(String m) {
        return AssistantIntentDetector.isOffTopic(m);
    }

    /** Public for AssistantService when skipping Gemini on off-topic questions. */
    public String offTopicReply(boolean english) {
        if (english) {
            return """
                    **GoRide** is a mobility app for **renting cars**, **carpooling**, and **booking drivers** in Tunisia.

                    I can't help with football, tennis, or other topics outside transport on this app.

                    Ask me about a rental, a shared trip, a driver ride, or how to use GoRide.""";
        }
        return """
                **GoRide** est une application de **mobilité** : **location de voitures**, **covoiturage** et **chauffeur** en Tunisie.

                Je ne peux pas répondre sur le football, le tennis ou d'autres sujets sans lien avec les trajets sur cette application.

                Posez-moi une question sur une location, un covoiturage, un chauffeur ou l'utilisation de GoRide.""";
    }

    private boolean isGoRideRelated(String m) {
        if (isHowToUsePlatformQuestion(m) || isCapabilitiesOrHelpQuestion(m)) {
            return true;
        }
        return containsAny(m,
                "voiture", "véhicule", "vehicule", "vehicle", " louer", "louer ", "location", "rent",
                "trajet", "trip", "covoiturage", "carpool", "chauffeur", "driver", "conducteur",
                "réserv", "reserv", "book", "sfax", "sousse", "monastir", "tunis", "hammamet", "ariana",
                "famille", "family", "enfant", "suv", "berline", "compte", "demo", "connexion", "login",
                "messager", "conversation", "favori", "explorer", "paiement", "flotte", "fleet",
                "autoroute", "route", "place", "passager", "client@", "goride.demo", "dt/", "tnd",
                "goride", "application", "plateforme", "platform", "utiliser", "utilise", "aide", "help",
                "comment", "guide", "menu", "passager", "propriétaire", "flotte");
    }

    private String capabilitiesReply(boolean en, int cars, int trips, int total) {
        if (en) {
            return """
                    I'm the **GoRide assistant** (Tunisia) — I answer with **live data** from the platform:
                    
                    - **Recommend cars** (family, economy, long trip)
                    - **Carpool** routes and prices
                    - **How to use the app** and **platform stats** (cars & trips available)
                    """
                    + AssistantPlatformKnowledge.platformStatsReply(cars, trips, total, true)
                    + "\n\n" + AssistantPlatformKnowledge.exampleQuestionsFr();
        }
        return """
                Je suis l'**assistant GoRide** (Tunisie) — je réponds avec les **données en direct** :
                
                - **Conseiller une voiture** (famille, économique, long trajet)
                - **Covoiturage** (trajets, prix, villes)
                - **Utiliser l'application** et **statistiques** (véhicules & trajets)
                - **Inscription / connexion** : utilisez les pages S'inscrire ou Connexion selon votre rôle
                
                """
                + AssistantPlatformKnowledge.platformStatsReply(cars, trips, total, false)
                + "\n\n" + AssistantPlatformKnowledge.exampleQuestionsFr();
    }

    private String unknownReply(boolean en) {
        return offTopicReply(en);
    }

    private boolean isGreetingOnly(String m) {
        String stripped = m.replaceAll("[^a-zàâçéèêëïîôùûü\\s]", " ").trim();
        if (stripped.length() > 40) {
            return false;
        }
        boolean hasGreeting = containsAny(stripped, "hi", "hello", "hey", "bonjour", "salut");
        boolean hasQuestion = containsAny(stripped, "best", "car", "voiture", "trajet", "trip", "sfax",
                "tunis", "family", "famille", "route", "traject", "covoiturage", "recommend", "give", "know", "what", "how",
                "peux", "faire", "pour", "aide", "help", "fonction", "capacit");
        return hasGreeting && !hasQuestion;
    }

    private boolean isRouteOrCarpoolQuestion(String m) {
        if (isFamilyCarQuestion(m)) {
            return false;
        }
        if (containsAny(m, "sfax", "sousse", "monastir", "route", "traject", "covoiturage",
                "carpool", "autoroute", "highway", "from tunisia", "tunisia to")) {
            return true;
        }
        return containsAny(m, "trajet", "tunis to", "to sfax", "to sousse")
                || (m.contains("trip") && containsAny(m, "sfax", "sousse", "tunis", "best route", "carpool"));
    }

    private boolean isFamilyCarQuestion(String m) {
        return containsAny(m, "family", "famille", "children", "child", "kids", "enfant", "bébé", "bebe", "baby");
    }

    private boolean isCarRecommendation(String m) {
        if (isCapabilitiesOrHelpQuestion(m) || isHowToUsePlatformQuestion(m)) {
            return false;
        }
        return containsAny(m, "voiture", "véhicule", "vehicule", "vehicle", " louer", "louer un", "louer une",
                "location de", "rent a", "rental", "recommend", "recommand", "conseil", "conseille", "choisir",
                "meilleure voiture", "meilleur véhicule", "quelle voiture", "which car", "best car", "best suv",
                "suv", "berline", "citadine", "compacte");
    }

    private String routeAndCarpoolReply(String m, List<Vehicle> vehicles, List<Trip> trips, boolean en) {
        boolean wantsSfax = m.contains("sfax");
        boolean wantsSousse = m.contains("sousse");

        List<Trip> relevant = trips.stream()
                .filter(t -> matchesRoute(t, m, wantsSfax, wantsSousse))
                .limit(5)
                .collect(Collectors.toList());

        List<Vehicle> localCars = vehicles.stream()
                .filter(v -> {
                    String loc = v.getLocation() != null ? v.getLocation().toLowerCase(Locale.ROOT) : "";
                    if (wantsSfax) return loc.contains("sfax");
                    if (wantsSousse) return loc.contains("sousse");
                    return loc.contains("tunis") || loc.contains("sfax") || loc.contains("sousse");
                })
                .sorted(Comparator.comparingDouble(v -> -(v.getRating() != null ? v.getRating() : 0)))
                .limit(3)
                .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        if (en) {
            sb.append("**Tunis ↔ Sfax** is about 270 km on **Autoroute A1** (~3 hours). ");
            if (!relevant.isEmpty()) {
                sb.append("**Carpool on GoRide:**\n");
                for (Trip t : relevant) {
                    sb.append(String.format("- %s → %s, **%.0f TND/seat**, %d seats left, departs %s\n",
                            t.getDeparture(), t.getDestination(), t.getPricePerSeat(),
                            t.getAvailableSeats(), formatDeparture(t)));
                }
                sb.append("Book via **Réserver une place** in the app.\n");
            } else {
                sb.append("No published carpool to Sfax right now — check **Réserver une place** or try **Commander un trajet**.\n");
            }
            if (!localCars.isEmpty()) {
                sb.append("**Rent at destination:**\n");
                for (Vehicle v : localCars) {
                    sb.append(formatVehicleEn(v)).append("\n");
                }
                sb.append("Open **Explorer les véhicules** and filter by city.\n");
            }
        } else {
            sb.append("**Tunis ↔ Sfax** : environ 270 km par l'**Autoroute A1** (~3 h). ");
            if (!relevant.isEmpty()) {
                sb.append("**Covoiturage GoRide :**\n");
                for (Trip t : relevant) {
                    sb.append(String.format("- %s → %s, **%.0f DT/place**, %d places, départ %s\n",
                            t.getDeparture(), t.getDestination(), t.getPricePerSeat(),
                            t.getAvailableSeats(), formatDeparture(t)));
                }
                sb.append("Réservez via **Réserver une place**.\n");
            } else {
                sb.append("Pas de covoiturage publié vers Sfax pour l'instant — voir **Réserver une place**.\n");
            }
            if (!localCars.isEmpty()) {
                sb.append("**Location sur place :**\n");
                for (Vehicle v : localCars) {
                    sb.append(formatVehicleFr(v)).append("\n");
                }
                sb.append("Ouvrez **Explorer les véhicules** et filtrez par ville.\n");
            }
        }
        return sb.toString().trim();
    }

    private boolean matchesRoute(Trip t, String m, boolean wantsSfax, boolean wantsSousse) {
        String dep = t.getDeparture() != null ? t.getDeparture().toLowerCase(Locale.ROOT) : "";
        String dest = t.getDestination() != null ? t.getDestination().toLowerCase(Locale.ROOT) : "";
        if (wantsSfax) {
            return dep.contains("sfax") || dest.contains("sfax")
                    || (dep.contains("tunis") && dest.contains("sfax"))
                    || (dest.contains("tunis") && dep.contains("sfax"));
        }
        if (wantsSousse) {
            return dep.contains("sousse") || dest.contains("sousse");
        }
        return dep.contains("tunis") || dest.contains("tunis") || dep.contains("sfax") || dest.contains("sfax");
    }

    private String familyCarReply(List<Vehicle> vehicles, boolean en) {
        List<Vehicle> ranked = vehicles.stream()
                .filter(v -> v.getSeats() != null && v.getSeats() >= 5)
                .sorted(Comparator
                        .comparingInt((Vehicle v) -> scoreFamily(v)).reversed()
                        .thenComparingDouble(v -> -(v.getRating() != null ? v.getRating() : 0)))
                .limit(3)
                .collect(Collectors.toList());

        if (ranked.isEmpty()) {
            return en
                    ? "No 5-seat vehicles in the catalog right now. Restart the backend with profile **h2** to load demo cars."
                    : "Aucun véhicule 5 places dans le catalogue. Redémarrez le backend (profil **h2**).";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(en
                ? "Best **family** options on GoRide right now (5 seats, comfort):\n"
                : "Meilleures options **famille** sur GoRide (5 places, confort) :\n");
        for (Vehicle v : ranked) {
            sb.append(en ? formatVehicleEn(v) : formatVehicleFr(v)).append("\n");
        }
        sb.append(en
                ? "Book in **Explorer les véhicules** or **Louer un véhicule**. Add to **Favorites** with the heart icon."
                : "Réservez dans **Explorer les véhicules**. Ajoutez aux **Favoris** avec le cœur.");
        return sb.toString().trim();
    }

    private int scoreFamily(Vehicle v) {
        int score = 0;
        String cat = v.getCategory() != null ? v.getCategory().toLowerCase(Locale.ROOT) : "";
        if (cat.contains("suv") || cat.contains("compacte") || cat.contains("monospace")) {
            score += 3;
        }
        if ("Automatique".equalsIgnoreCase(v.getTransmission())) {
            score += 1;
        }
        if (v.getSeats() != null && v.getSeats() >= 5) {
            score += 2;
        }
        return score;
    }

    private String generalCarReply(List<Vehicle> vehicles, boolean en) {
        List<Vehicle> top = vehicles.stream()
                .sorted(Comparator.comparingDouble(v -> -(v.getRating() != null ? v.getRating() : 0)))
                .limit(3)
                .collect(Collectors.toList());
        if (top.isEmpty()) {
            return en ? "Fleet is empty — start backend with **h2** profile." : "Flotte vide — démarrez le backend (profil **h2**).";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(en ? "Top picks on GoRide today:\n" : "Notre sélection du moment :\n");
        for (Vehicle v : top) {
            sb.append(en ? formatVehicleEn(v) : formatVehicleFr(v)).append("\n");
        }
        return sb.toString().trim();
    }

    private String greetingWithHints(List<Vehicle> vehicles, List<Trip> trips, boolean en) {
        return en
                ? String.format("Hello! I can see **%d cars** and **%d carpool trips** on GoRide. Try: \"best family car\" or \"Tunis to Sfax route\".",
                vehicles.size(), trips.size())
                : String.format("Bonjour ! **%d véhicules** et **%d trajets** covoiturage disponibles. Ex. : « voiture famille » ou « trajet Tunis Sfax ».",
                vehicles.size(), trips.size());
    }

    private String generalHelpReply(List<Vehicle> vehicles, List<Trip> trips, boolean en) {
        if (en) {
            return String.format(
                    "On GoRide I found **%d rentable vehicles** and **%d upcoming trips**. "
                            + "Examples: \"best car for family trip\", \"Tunis to Sfax carpool\", \"SUV in Sousse\". "
                            + "Use **Explorer les véhicules** to book.",
                    vehicles.size(), trips.size());
        }
        return String.format(
                "Sur GoRide : **%d véhicules** et **%d trajets** covoiturage. "
                        + "Exemples : « voiture pour famille », « trajet Tunis Sfax », « SUV à Sousse ». "
                        + "Ouvrez **Explorer les véhicules**.",
                vehicles.size(), trips.size());
    }

    private String formatVehicleEn(Vehicle v) {
        return String.format("- **%s %s** (%s) — %s seats, %s, **%.0f TND/day**, %s, rating %.1f",
                v.getBrand(), v.getModel(), v.getLicensePlate(),
                v.getSeats(), v.getTransmission(),
                v.getDailyPrice() != null ? v.getDailyPrice() : 0,
                v.getLocation(), v.getRating() != null ? v.getRating() : 4.5);
    }

    private String formatVehicleFr(Vehicle v) {
        return String.format("- **%s %s** (%s) — %d places, %s, **%.0f DT/jour**, %s, note %.1f",
                v.getBrand(), v.getModel(), v.getLicensePlate(),
                v.getSeats() != null ? v.getSeats() : 5, v.getTransmission(),
                v.getDailyPrice() != null ? v.getDailyPrice() : 0,
                v.getLocation(), v.getRating() != null ? v.getRating() : 4.5);
    }

    private String formatDeparture(Trip t) {
        return t.getDepartureTime() != null
                ? t.getDepartureTime().toString().replace('T', ' ').substring(0, Math.min(16, t.getDepartureTime().toString().length()))
                : "—";
    }

    private boolean containsAny(String text, String... words) {
        for (String w : words) {
            if (text.contains(w)) {
                return true;
            }
        }
        return false;
    }
}
