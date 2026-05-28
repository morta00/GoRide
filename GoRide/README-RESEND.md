# GoRide — Resend (automatic emails)

| | |
|--|--|
| **Get API key** | https://resend.com/api-keys |
| **Dashboard** | https://resend.com/emails |
| **Config file** | `src/main/resources/application-local.properties` |

```properties
goride.mail.enabled=true
goride.mail.provider=resend
resend.api-key=re_xxxxxxxx
resend.from=GoRide <onboarding@resend.dev>
```

## What sends email automatically

Every **in-app notification** also sends an email (Resend) when `goride.mail.enabled=true`:

- Ride requested / driver found / ride started / completed / cancelled  
- Carpool booking confirmed / cancelled  
- Rental requested / accepted / rejected  
- Welcome on signup  
- Password reset  

## Collaborators (GitHub)

See **`EMAIL-SETUP-COLLABORATORS.md`** — copy `application-local.properties.example`, add your `re_...` key, never commit secrets.

## Free tier note

With `onboarding@resend.dev`, Resend only delivers to **your Resend account email** until you verify a domain. Set `goride.mail.dev-redirect-to` to that address so reset/welcome copies arrive while testing.

To send to any user: add a domain in https://resend.com/domains and set:

```properties
resend.from=GoRide <noreply@yourdomain.com>
```

## AI chatbot (separate)

| | |
|--|--|
| **Gemini key** | https://aistudio.google.com/apikey |
| **Config** | `goride.ai.gemini-api-key` in `application-local.properties` |

Not the same as the Resend `re_...` key.
