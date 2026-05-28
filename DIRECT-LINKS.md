# GoRide — Direct links (no personal email needed)

Emails are **optional** and **off by default** (`goride.mail.enabled=false`).

Confirmations work **inside the app**: notifications + URLs below.

---

## Get all links from the API (JSON)

With backend running:

**http://localhost:8081/api/public/links**

---

## App links (copy in browser after login)

Base: **http://localhost:4200**

### Everyone

| Action | Direct link |
|--------|-------------|
| Login | http://localhost:4200/login |
| Sign up | http://localhost:4200/signup |

### Passenger (client)

| Action | Direct link |
|--------|-------------|
| Dashboard | http://localhost:4200/client/dashboard |
| Explore / rent a car | http://localhost:4200/client/explore |
| **My reservations** (after booking) | http://localhost:4200/client/reservations |
| One reservation | http://localhost:4200/client/reservations/{id} |
| Book a carpool seat | http://localhost:4200/client/available-rides |
| Request a driver (Taxi) | http://localhost:4200/client/request-ride |
| **Current ride** (track driver) | http://localhost:4200/client/current-ride |
| Messages | http://localhost:4200/client/conversations |
| Notifications | http://localhost:4200/client/notifications |

### Driver

| Action | Direct link |
|--------|-------------|
| Dashboard | http://localhost:4200/driver/dashboard |
| **Accept ride requests** | http://localhost:4200/driver/requests |
| Published trips | http://localhost:4200/driver/trips |
| Messages | http://localhost:4200/driver/conversations |
| Notifications | http://localhost:4200/driver/notifications |

### Fleet owner

| Action | Direct link |
|--------|-------------|
| Dashboard | http://localhost:4200/fleet/dashboard |
| **Rental requests** (accept/refuse) | http://localhost:4200/fleet/bookings |
| My vehicles | http://localhost:4200/fleet/vehicles |

---

## Example flows (no email)

### Confirm a car rental

1. Login as `client@goride.demo` / `Demo1234!`
2. Open http://localhost:4200/client/explore → book a car
3. Open **http://localhost:4200/client/reservations** — status is there
4. Fleet owner: **http://localhost:4200/fleet/bookings** → accept

### Confirm a ride (passenger)

1. **http://localhost:4200/client/request-ride** → request Tunis → Sousse
2. Track: **http://localhost:4200/client/current-ride**
3. Driver: **http://localhost:4200/driver/requests** → accept
4. Chat: **http://localhost:4200/client/conversations**

### Carpool seat

1. **http://localhost:4200/client/available-rides** → search & book

### Password reset (without Gmail)

1. Use forgot password on login page
2. API returns `resetLink` in JSON (dev mode)
3. Or check backend console: `[GORIDE LINK] Réinitialisation mot de passe → http://localhost:4200/r?token=...`

---

## External API keys (only if you want extras)

### AI chatbot (Google AI Studio) — optional, usually free, no card

| Step | Link |
|------|------|
| **Create API key** | https://aistudio.google.com/apikey |
| **Put key in** | `GoRide/src/main/resources/application-local.properties` |

```properties
goride.ai.provider=gemini
goride.ai.gemini-api-key=YOUR_KEY_HERE
```

### Gmail (only if you want real emails later)

| Step | Link |
|------|------|
| App password | https://myaccount.google.com/apppasswords |
| Then set | `goride.mail.enabled=true` + Gmail in `application-local.properties` |

### Google Maps — skip (use free map in app)

Not needed. Map: **Explorer → Vue carte** (Leaflet).

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Passenger | client@goride.demo | Demo1234! |
| Driver | driver@goride.demo | Demo1234! |
| Fleet owner | owner@goride.demo | Demo1234! |
