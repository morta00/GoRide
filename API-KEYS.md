# GoRide — API keys & secrets (100% free options)

**No credit card required** for normal use: maps (Leaflet), chatbot (local mode), and demo data work without any key.

---

## Quick reference

| Feature | Is it an "API key"? | Where to configure | Free without card? |
|---------|---------------------|--------------------|--------------------|
| **Automatic email** | No — Gmail **App Password** | `GoRide/.../application-local.properties` | Yes (Gmail account) |
| **AI chatbot (smart)** | Yes — **Gemini** key (optional) | `application-local.properties` | Yes (Google AI Studio) |
| **AI chatbot (basic)** | None | Works out of the box | Yes |
| **Maps** | None | Leaflet already in the app | Yes |
| **Google Maps** | Optional | `environment.ts` | Needs billing — **skip** |
| **Passenger ↔ driver chat** | None | Built-in WebSocket | Yes |

---

## 1. Automatic email (NOT a Google Maps key)

GoRide sends emails for: welcome, password reset, rental notifications, contact form.

### Where to put it

| File | Variables |
|------|-----------|
| **`GoRide/src/main/resources/application-local.properties`** | `spring.mail.username`, `spring.mail.password`, `goride.contact.to` |
| **Or environment variables** | `GORIDE_MAIL_USERNAME`, `GORIDE_MAIL_PASSWORD`, `GORIDE_CONTACT_EMAIL` |

Copy from: `GoRide/src/main/resources/application-local.properties.example`

Detailed guide: **`GoRide/README-EMAIL.md`**

### How to get it (Gmail — free, no payment API)

1. Create or use a **free Gmail** account (no credit card for Gmail itself).
2. Enable **2-Step Verification**: https://myaccount.google.com/security  
3. Create an **App password** (16 characters): https://myaccount.google.com/apppasswords  
   - Choose app: **Mail**, device: **Other (GoRide)**  
4. Paste in `application-local.properties`:

```properties
spring.mail.username=youremail@gmail.com
spring.mail.password=abcd efgh ijkl mnop
goride.contact.to=youremail@gmail.com
```

This is **not** an "email API key" from a shop — it is only your Gmail + app password for SMTP.

### If you skip email

The app still runs. Emails are simply not sent (logs may show SMTP errors — that is OK for local dev).

---

## 2. AI chatbot assistant (new)

A floating **Aide** button appears on every page.

### Mode A — Local (default, **no key**)

- Answers common GoRide questions in French.
- Config: `goride.ai.provider=local` (default in `application.properties`).

### Mode B — Smarter AI with **Google Gemini** (free tier, usually **no credit card**)

1. Open: **https://aistudio.google.com/apikey**  
2. Sign in with Google → **Create API key**  
3. Add to `application-local.properties`:

```properties
goride.ai.provider=gemini
goride.ai.gemini-api-key=PASTE_YOUR_KEY_HERE
```

4. Restart the backend.

| Setting | File |
|---------|------|
| Provider | `goride.ai.provider` → `local` or `gemini` |
| Gemini key | `goride.ai.gemini-api-key` |
| Model | `goride.ai.gemini-model` (default `gemini-2.0-flash`) |
| Env var alternative | `GORIDE_GEMINI_API_KEY`, `GORIDE_AI_PROVIDER` |

**Do not put the Gemini key in `environment.ts`** — it stays on the server only (safer).

### API endpoints

- `GET /api/assistant/status` — shows `local` or `gemini` mode  
- `POST /api/assistant/chat` — `{ "message": "...", "locale": "fr" }`

### Recommandations IA dans l'app (hors chatbot)

Même clé Gemini. Panneaux **Conseiller GoRide IA** sur :

- **Explorer les véhicules** — meilleure voiture (confort, économie, famille, long trajet, éco)
- **Réserver une place** (covoiturage) — meilleur trajet partagé
- **Commander un trajet** — conseils avant d'envoyer la demande

| Endpoint | Usage |
|----------|--------|
| `GET /api/ai/status` | `gemini` ou `local` |
| `POST /api/ai/recommend/vehicles` | `{ "preference": "comfort", "location": "Tunis", ... }` |
| `POST /api/ai/recommend/trips` | `{ "preference": "economy", "departure": "Tunis", ... }` |
| `POST /api/ai/advise/ride` | Conseils course individuelle |

Sans clé Gemini : règles locales intelligentes (toujours fonctionnel).

---

## 3. Maps (already free)

| What | Where |
|------|--------|
| **Used in the app** | Leaflet + OpenStreetMap |
| **Config** | Nothing — leave `googleMapsApiKey` empty in `angularpfe/src/environments/environment.ts` |

Do **not** use Google Maps if you have no credit card.

---

## 4. Messaging (chauffeur / client) — not AI

Real-time chat between users uses **your own backend** (`/api/messages`, WebSocket `/ws`).

**No external API key.**

---

## 5. Frontend `environment.ts`

Path: **`angularpfe/src/environments/environment.ts`**

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081/api',
  googleMapsApiKey: '',   // leave empty
  mapboxAccessToken: ''   // leave empty
};
```

Example copy: `environment.example.ts`

---

## 6. Database (not an API key)

| MySQL | `application.properties` → `spring.datasource.*` |
| No MySQL | `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"` |

---

## Demo accounts (no keys)

| Role | Email | Password |
|------|-------|----------|
| Passenger (Riadh Landolsi) | `client@goride.demo` | `Demo1234!` |
| Driver (Imed Kilani) | `driver@goride.demo` | `Demo1234!` |
| Fleet owner (Ahmed Abidi) | `owner@goride.demo` | `Demo1234!` |

---

## Clone and run (private repo `morta00/987654321-`)

After `git clone`, open **`GoRide/src/main/resources/application-local.properties`**:

| Variable | Action |
|----------|--------|
| `resend.api-key` | Paste your Resend key (`re_...` from https://resend.com/api-keys) |
| `goride.mail.dev-redirect-to` | Your Resend login email (sandbox mode) |
| `goride.ai.gemini-api-key` | Optional — https://aistudio.google.com/apikey |

Then start backend: `cd GoRide && .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"`

Frontend: `cd angularpfe && npm install --legacy-peer-deps && ng serve`
