package com.pfeproject.GoRide.services;

/**
 * Canonical GoRide platform knowledge for the assistant (Gemini system prompt + smart fallback).
 */
public final class AssistantPlatformKnowledge {

    private AssistantPlatformKnowledge() {
    }

    public static final String SYSTEM_APPENDIX_FR = """

            --- GUIDE PLATEFORME GORIDE (à utiliser pour expliquer l'app) ---
            GoRide = location de véhicules + covoiturage + course chauffeur + messagerie (Tunisie).

            Démarrage : page **Connexion** ou **Inscription** (choisir son rôle : client, chauffeur, propriétaire, entreprise).
            Ne jamais afficher d'e-mails ni de mots de passe dans les guides d'utilisation.

            CLIENT (passager) — menu principal :
            - Explorer les véhicules : carte + liste, louer une voiture
            - Favoris : sauvegarder des véhicules (icône cœur)
            - Réserver une place : covoiturage (trajets partagés)
            - Commander un trajet : demander un chauffeur (type taxi)
            - Mes réservations : suivre locations et places covoiturage
            - Course en cours : suivi temps réel du chauffeur
            - Conversations / Notifications / Paiements / Historique

            CHAUFFEUR :
            - Demandes reçues : accepter/refuser courses et réservations covoiturage
            - Mes trajets / Proposer un trajet (covoiturage)
            - Mon véhicule, Revenus, Conversations, Notifications

            PROPRIÉTAIRE DE FLOTTE :
            - Mes véhicules : gérer la flotte
            - Demandes de location : accepter/refuser les locations clients

            ENTREPRISE :
            - Louer un véhicule : catalogue complet (comme client) + recommandations IA
            - Demander un service : location flotte, chauffeur, demande personnalisée
            - Demandes en cours : suivi des réservations entreprise

            ADMIN : tableau de bord administration (accès réservé, sans divulguer d'identifiants).

            Si on demande « comment utiliser l'application » ou « que faire sur la plateforme » :
            répondre avec ce guide structuré par rôle — ce n'est JAMAIS hors sujet.
            """;

    public static final String SYSTEM_APPENDIX_EN = """

            --- GORIDE PLATFORM GUIDE (use when explaining the app) ---
            GoRide = car rental + carpooling + driver booking + messaging (Tunisia).

            Start: **Login** or **Sign up** page — pick your role (client, driver, fleet owner, company).
            Never show emails or passwords in usage guides.

            CLIENT: Explore vehicles, Favorites, Book a carpool seat, Request a driver, My reservations,
            Current ride tracking, Messages, Notifications, Payments, History.

            DRIVER: Incoming requests, My trips, Create trip, My vehicle, Earnings, Messages, Notifications.

            FLEET OWNER: My vehicles, Rental requests (accept/refuse).

            Questions about how to use the app or platform are ALWAYS in scope — use this guide.
            """;

    public static String howToUsePlatformReply(boolean en) {
        if (en) {
            return """
                    **GoRide in 30 seconds**

                    GoRide helps you **rent a car**, **share a ride (carpool)**, or **book a driver** in Tunisia — all from one app.

                    **Start:** tap **Sign up** (pick your role: passenger, driver, fleet owner, or company) or **Log in** if you already have an account.

                    **Most common actions**
                    - **Passenger** - *Explore vehicles* (rent), *Book a seat* (carpool), *Request a driver*, *My reservations*
                    - **Driver** - accept requests, publish trips, track earnings
                    - **Fleet owner** - manage vehicles, approve rental requests
                    - **Company** - *Rent a vehicle* or *Request a service*

                    **What would you like to do?** Tell me your role and goal (e.g. « rent a car in Tunis for 3 days » or « carpool Tunis to Sfax ») and I'll give you exact menu steps.""";
        }
        return """
                **GoRide en 30 secondes**

                GoRide réunit **location de voiture**, **covoiturage** et **chauffeur à la demande** en Tunisie — dans une seule application.

                **Démarrage :** **S'inscrire** (choisissez client, chauffeur, propriétaire ou entreprise) ou **Connexion** si vous avez déjà un compte.

                **Actions principales**
                - **Client** - *Explorer les véhicules*, *Réserver une place* (covoiturage), *Commander un trajet*, *Mes réservations*
                - **Chauffeur** - demandes reçues, proposer un trajet, revenus
                - **Propriétaire** - mes véhicules, valider les locations
                - **Entreprise** - *Louer un véhicule* ou *Demander un service*

                **Que voulez-vous faire ?** Indiquez votre rôle et votre besoin (ex. « louer une voiture à Tunis 3 jours » ou « covoiturage Tunis Sfax ») et je vous guide pas à pas dans les menus.""";
    }

    public static String capabilitiesReplyShort(boolean en, int cars, int trips) {
        if (en) {
            return String.format("""
                    I can help you with **GoRide** using **live data** (%d cars to rent, %d carpool trips open).

                    - Recommend a **real vehicle** from our fleet (price, city, seats)
                    - Find **carpool** options between cities
                    - Explain **how to use** the app step by step
                    - Compare **rent vs carpool vs driver** for your trip

                    Ask something specific — e.g. « family car in Sousse » or « how to book carpool ».""",
                    cars, trips);
        }
        return String.format("""
                Je vous aide sur **GoRide** avec les **données en direct** (%d véhicules louables, %d trajets covoiturage).

                - Conseiller une **vraie voiture** de la flotte (prix, ville, places)
                - Trouver un **covoiturage** entre villes
                - Expliquer **comment utiliser** l'application
                - Comparer **location / covoiturage / chauffeur** selon votre trajet

                Posez une question précise — ex. « voiture famille à Sousse » ou « réserver un covoiturage ».""",
                cars, trips);
    }

    /** Live platform counts — precise answers for "how many cars/trips". */
    public static String platformStatsReply(int availableVehicles, int upcomingCarpoolTrips, int totalVehicles, boolean en) {
        if (en) {
            return String.format("""
                    **GoRide right now** (live data):
                    
                    - **%d vehicles** available to rent (explore / rent)
                    - **%d carpool trips** open for booking (book a seat)
                    - **%d vehicles** total in the catalog
                    
                    **What you can do:** rent a car, book a carpool seat, request a driver, message owners/drivers, manage favorites.
                    
                    Ask me: « best family car », « Tunis to Sousse carpool », or « how to use the app ».""",
                    availableVehicles, upcomingCarpoolTrips, totalVehicles);
        }
        return String.format("""
                **GoRide en ce moment** (données en direct) :
                
                - **%d véhicules** disponibles à la location (Explorer / Louer)
                - **%d trajets** de covoiturage ouverts aux réservations (Réserver une place)
                - **%d véhicules** au total dans le catalogue
                
                **Ce que vous pouvez faire :** louer une voiture, réserver une place en covoiturage, commander un chauffeur, messagerie, favoris.
                
                Exemples : « quelle voiture pour la famille », « covoiturage Tunis Sousse », « comment utiliser l'application ».""",
                availableVehicles, upcomingCarpoolTrips, totalVehicles);
    }

    public static String exampleQuestionsFr() {
        return """
                **Exemples de questions utiles :**
                - Comment utiliser GoRide ?
                - Combien de voitures et de trajets sont disponibles ?
                - Quelle voiture pour 4 personnes à Sousse ?
                - Trajet covoiturage Tunis → Sfax
                - Comment réserver une place ?
                - Comment s'inscrire en tant que chauffeur ?""";
    }
}
