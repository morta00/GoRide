# GoRide — Mobility Platform

Web application for **vehicle rentals**, **carpooling**, **on-demand rides**, and **messaging** between customers, drivers, and fleet owners.

## Structure

| Folder | Technology |
|--------|------------|
| `GoRide/` | Spring Boot backend (REST API, JWT, WebSocket) |
| `angularpfe/` | Angular 16 frontend |

## Quick Start (demo without MySQL)

### Backend

```bash
cd GoRide
./mvnw spring-boot:run -Dspring-boot.run.profiles=h2
```

API: http://localhost:8081/api

### Frontend

```bash
cd angularpfe
npm install --legacy-peer-deps
ng serve
```

App: http://localhost:4200

## Admin Account

| Field | Value |
|-------|-------|
| **Email (username)** | `admin@goride.tn` |
| **Password** | `admin123` |

Login: http://localhost:4200/login — admin area available after authentication.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Administrator** | `admin@goride.tn` | `admin123` |
| Customer / passenger (Riadh Landolsi) | `client@goride.demo` | `Demo1234!` |
| Driver (Imed Kilani) | `driver@goride.demo` | `Demo1234!` |
| Fleet owner (Ahmed Abidi) | `owner@goride.demo` | `Demo1234!` |
| Company | `company@goride.demo` | `Demo1234!` |

## API Keys (collaborator — private repo)

See **`API-KEYS.md`** and **`GoRide/src/main/resources/application-local.properties`** (Resend + Gemini).

## Documentation

- `DIRECT-LINKS.md` — direct links to screens
- `API-KEYS.md` — API key and service details
- `GoRide/README-EMAIL.md` — email configuration

## Main Features

- Vehicle search and booking (Leaflet map)
- Shared ride booking: search, reserve, cancel
- Individual ride ordering and driver tracking
- Messaging between owners ↔ customers and drivers ↔ passengers
- AI assistant and recommendations (Gemini optional on the backend)
- Roles: customer, driver, owner, company, admin

---
GoRide.
