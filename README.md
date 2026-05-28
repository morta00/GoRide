# GoRide — Plateforme de mobilité (PFE)

Application web de **location de véhicules**, **covoiturage**, **courses à la demande** et **messagerie** entre clients, chauffeurs et propriétaires de flotte.

## Structure

| Dossier | Technologie |
|---------|-------------|
| `GoRide/` | Backend Spring Boot (API REST, JWT, WebSocket) |
| `angularpfe/` | Frontend Angular 16 |

## Démarrage rapide (démo sans MySQL)

### Backend

```bash
cd GoRide
./mvnw spring-boot:run -Dspring-boot.run.profiles=h2
```

API : http://localhost:8081/api

### Frontend

```bash
cd angularpfe
npm install --legacy-peer-deps
ng serve
```

Application : http://localhost:4200

## Compte administrateur

| Champ | Valeur |
|-------|--------|
| **E-mail (identifiant)** | `admin@goride.tn` |
| **Mot de passe** | `admin123` |

Connexion : http://localhost:4200/login — espace admin après authentification.

## Comptes démo

| Rôle | Email | Mot de passe |
|------|--------|--------------|
| **Administrateur** | `admin@goride.tn` | `admin123` |
| Client / passager (Riadh Landolsi) | `client@goride.demo` | `Demo1234!` |
| Chauffeur (Imed Kilani) | `driver@goride.demo` | `Demo1234!` |
| Propriétaire flotte (Ahmed Abidi) | `owner@goride.demo` | `Demo1234!` |
| Entreprise | `company@goride.demo` | `Demo1234!` |

## Clés API (collaborateur — dépôt privé)

Voir **`API-KEYS.md`** et **`GoRide/src/main/resources/application-local.properties`** (Resend + Gemini).

## Documentation

- `DIRECT-LINKS.md` — liens directs vers les écrans
- `API-KEYS.md` — détail des clés et services
- `GoRide/README-EMAIL.md` — configuration e-mail

## Fonctionnalités principales

- Exploration et réservation de véhicules (carte Leaflet)
- Trajets partagés : recherche, réservation, annulation
- Commande de course individuelle et suivi chauffeur
- Messagerie propriétaire ↔ client / chauffeur ↔ passager
- Assistant et recommandations IA (Gemini optionnel côté serveur)
- Rôles : client, chauffeur, propriétaire, entreprise, admin

---
Projet de fin d'études — GoRide.
