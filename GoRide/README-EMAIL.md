# GoRide — Email configuration

**You do not need email for GoRide to work.**  
Confirmations use **in-app links** + **notifications** (`DIRECT-LINKS.md`).  
Email is optional.

**AI chatbot** uses your **Google AI key** (`AIzaSy...`) in `application-local.properties` — that is **not** an email key.

---

## Why Gmail shows “not available for your account”

On https://myaccount.google.com/apppasswords you may see:

> *The setting you are looking for is not available for your account.*

**Common causes:**

1. **2-Step Verification is OFF** — App Passwords only appear after it is ON.
2. **School / work Google account** — admin blocks App Passwords.
3. **“Sign in with Google” only / some account types** — App Passwords disabled.
4. **Advanced Protection** enabled — App Passwords disabled.

### Fix Gmail (try in this order)

| Step | Link | Action |
|------|------|--------|
| 1 | https://myaccount.google.com/signinoptions/two-step-verification | Turn **ON** 2-Step Verification (SMS or app) |
| 2 | Wait 5 minutes, sign out/in | |
| 3 | https://myaccount.google.com/apppasswords | Create password → App: **Mail**, Device: **GoRide** |
| 4 | If still blocked | Use **Brevo** below (free, no App Password) |

Security hub (all options): https://myaccount.google.com/security

### Gmail in `application-local.properties`

```properties
goride.mail.enabled=true
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=youremail@gmail.com
spring.mail.password=your_16_char_app_password
goride.contact.to=youremail@gmail.com
```

`spring.mail.password` = **App Password** (16 letters), **not** your normal Gmail password and **not** your `AIzaSy` AI key.

---

## Brevo — recommended if Gmail App Passwords fail (free)

Works without Google App Passwords. Good for PFE / no credit card.

| Step | Link |
|------|------|
| 1. Sign up (free) | https://www.brevo.com/free/ |
| 2. Get SMTP key | https://app.brevo.com/settings/keys/smtp |
| 3. Copy **SMTP key** + your Brevo login email | |

### Brevo in `application-local.properties`

```properties
goride.mail.enabled=true
spring.mail.host=smtp-relay.brevo.com
spring.mail.port=587
spring.mail.username=your-brevo-login-email@example.com
spring.mail.password=YOUR_BREVO_SMTP_KEY
goride.contact.to=your-brevo-login-email@example.com
```

Restart backend after saving.

---

## Other providers

| Provider | Where to get SMTP / API key |
|----------|------------------------------|
| SendGrid | https://app.sendgrid.com/settings/api_keys |
| Mailgun | https://app.mailgun.com/ |
| Mailtrap (tests only) | https://mailtrap.io/inboxes |

---

## Default in this project

`goride.mail.enabled=false` in `application.properties` — **no email configured**.

Use:

- http://localhost:4200/client/reservations  
- http://localhost:4200/client/notifications  
- http://localhost:8081/api/public/links  

---

## AI key (already separate)

| What | Link |
|------|------|
| Google AI / Gemini | https://aistudio.google.com/apikey |
| Config file | `application-local.properties` → `goride.ai.gemini-api-key` |

Enable API if needed: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
