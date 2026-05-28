package com.pfeproject.GoRide.services;

import java.util.Locale;

/** Classifies user messages so the assistant can pick the right context and reply style. */
public final class AssistantIntentDetector {

    private AssistantIntentDetector() {
    }

    public enum Intent {
        OFF_TOPIC,
        HOW_TO_USE,
        PLATFORM_STATS,
        CAPABILITIES,
        VEHICLE_ADVICE,
        CARPOOL,
        GENERAL_GORIDE
    }

    public static boolean isOffTopic(String message) {
        String m = message != null ? message.toLowerCase(Locale.ROOT) : "";
        if (m.isBlank()) {
            return false;
        }
        if (isGoRideRelated(m)) {
            return false;
        }
        return containsAny(m,
                "football", " soccer", "tennis", "tenis", "basket", "basketball", "rugby",
                "handball", "volley", "volleyball", "nba", "ligue 1", "champions league", "coupe du monde",
                "messi", "ronaldo", "psg", "real madrid", "barcelona", "barcelone",
                "météo", "meteo", "weather", "bitcoin", "crypto", "politique", "president", "président",
                "recette", "recipe", "homework", "devoirs", "python code", "javascript", "cinema", "film ",
                "musique", "music", "game ", "jeu video", "vidéo game", "netflix", "instagram");
    }

    public static Intent detect(String message) {
        String m = message != null ? message.toLowerCase(Locale.ROOT) : "";
        if (isOffTopic(m)) {
            return Intent.OFF_TOPIC;
        }
        if (isHowToUse(m)) {
            return Intent.HOW_TO_USE;
        }
        if (isStats(m)) {
            return Intent.PLATFORM_STATS;
        }
        if (isCapabilities(m)) {
            return Intent.CAPABILITIES;
        }
        if (containsAny(m, "covoiturage", "carpool", "sfax", "sousse", "trajet ", " trip", "seat")) {
            return Intent.CARPOOL;
        }
        if (containsAny(m, "voiture", "véhicule", "vehicule", "vehicle", "louer", "rent", "suv", "famille", "family")) {
            return Intent.VEHICLE_ADVICE;
        }
        return Intent.GENERAL_GORIDE;
    }

    public static boolean needsFullVehicleCatalog(Intent intent) {
        return intent == Intent.VEHICLE_ADVICE || intent == Intent.CARPOOL || intent == Intent.GENERAL_GORIDE;
    }

    private static boolean isHowToUse(String m) {
        return containsAny(m,
                "comment utiliser", "how to use", "how do i use", "use this app", "use the app",
                "utiliser l'application", "utiliser cette application", "utiliser la plateforme",
                "comment ça marche", "comment ca marche", "guide d'utilisation", "how does the app",
                "how does goride", "premiers pas", "getting started", "commencer sur");
    }

    private static boolean isStats(String m) {
        return containsAny(m,
                "combien de voiture", "combien de véhicule", "combien de trajet", "how many car",
                "how many vehicle", "how many trip", "véhicules disponibles", "cars available",
                "trajets disponibles", "en ce moment", "right now", "live data", "statistiques");
    }

    private static boolean isCapabilities(String m) {
        return containsAny(m,
                "que peux-tu", "what can you do", "what can i do", "que puis-je", "who are you",
                "qu'est-ce que tu", "tes capacités", "your capabilities", "à quoi tu sers");
    }

    private static boolean isGoRideRelated(String m) {
        return containsAny(m,
                "goride", "go ride", "voiture", "véhicule", "vehicule", "vehicle", "louer", "location", "rent",
                "trajet", "trip", "covoiturage", "carpool", "chauffeur", "driver", "réserv", "reserv", "book",
                "sfax", "sousse", "monastir", "tunis", "hammamet", "mobilité", "mobility", "passager",
                "flotte", "fleet", "application", "plateforme", "platform", "explorer", "app ");
    }

    private static boolean containsAny(String m, String... needles) {
        for (String n : needles) {
            if (m.contains(n)) {
                return true;
            }
        }
        return false;
    }
}
