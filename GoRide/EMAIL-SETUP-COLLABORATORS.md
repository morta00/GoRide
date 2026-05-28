# E-mails GoRide — guide collaborateur (GitHub)

Welcome e-mail (inscription) and password reset use **Resend**. Each developer uses **their own** API key (never commit it).

## 1. After `git clone`

```bash
cd GoRide/src/main/resources
copy application-local.properties.example application-local.properties   # Windows
# cp application-local.properties.example application-local.properties   # Mac/Linux
```

Edit `application-local.properties`:

| Property | What to put |
|----------|-------------|
| `resend.api-key` | Your key from https://resend.com/api-keys (`re_...`) |
| `resend.from` | `GoRide <onboarding@resend.dev>` (until you verify a domain) |
| `goride.mail.dev-redirect-all` | `true` (sandbox: all mails go to your inbox) |
| `goride.mail.dev-redirect-to` | **The e-mail of your Resend account** (same as login on resend.com) |
| `app.base-url` | `http://localhost:4200` (or your deployed frontend URL) |

## 2. Test that Resend works

Start backend, then open:

- http://localhost:8081/api/auth/mail-status → `"mailEnabled": true`
- http://localhost:8081/api/test/email?to=YOUR_RESEND_ACCOUNT_EMAIL

You should receive **Bienvenue sur GoRide** in inbox or spam.

## 3. Password reset (local)

1. Open http://localhost:4200/login → **Mot de passe oublié**
2. Enter an e-mail that **exists** in the app (e.g. `client@goride.demo` after H2 seed)
3. On success you get:
   - A **reset link on the page** (always, dev mode)
   - An e-mail **Réinitialisation mot de passe GoRide** (to your address or `dev-redirect-to` inbox)

4. Open the link → form **Nouveau mot de passe** (not only login)

## 4. Signup welcome e-mail

Register at http://localhost:4200/signup → e-mail **Bienvenue sur GoRide** from `onboarding@resend.dev`.

## 5. Production / real users

To send to **any** user e-mail (not only your Resend account):

1. Verify a domain: https://resend.com/domains  
2. Set `resend.from=GoRide <noreply@votredomaine.com>`  
3. Remove or leave empty `goride.mail.dev-redirect-to`

## 6. Environment variables (optional, CI / server)

Instead of `application-local.properties`:

```bash
set RESEND_API_KEY=re_xxxxx
set GORIDE_MAIL_DEV_REDIRECT=your@email.com
set GORIDE_DEV_EXPOSE_RESET_LINK=true
```

## 7. Do not push secrets

`application-local.properties` is in `.gitignore`. Only push `application-local.properties.example`.
