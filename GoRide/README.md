# ⚙️ GoRide - Backend API (Spring Boot)

Le moteur de la plateforme **GoRide**, gérant la logique métier, la sécurité et la communication en temps réel.

## 🚀 Fonctionnalités Backend

- 🔐 **Authentification Sécurisée** : Gestion des rôles (Propriétaire, Client, Admin) via JWT.
- 💬 **Moteur de Messagerie** : API REST pour l'historique et WebSockets pour l'instantanéité.
- 📡 **WebSocket Broker** : Diffusion STOMP des messages et des événements de lecture.
- 🗄️ **Persistance des Données** : MySQL avec JPA/Hibernate pour une intégrité parfaite.
- 🚗 **Gestion de Flotte** : Endpoints pour les véhicules, réservations et contrats.

## 🛠️ Stack Technique

- **Langage** : Java 17
- **Framework** : Spring Boot 3.x
- **Sécurité** : Spring Security & JWT
- **Temps Réel** : Spring Messaging (WebSocket)
- **Base de données** : MySQL
- **Outils** : Maven, Lombok

## 🛠️ Configuration & Lancement

1. Configurer la base de données MySQL dans `application.properties`.
2. Installer les dépendances : `mvn clean install`.
3. Lancer l'application : `mvn spring-boot:run`.
4. L'API est disponible sur : `http://localhost:8081/api`.

---
*Projet de Fin d'Études - GoRide Architecture.*
