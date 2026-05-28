# iheb.com — DNS GoDaddy pour Resend (à faire dans VOTRE compte)

GoRide est déjà configuré avec `resend.from=GoRide <noreply@iheb.com>`.

**Je ne peux pas me connecter à votre GoDaddy** — ces étapes sont à faire par vous (5–10 min).

## 1. Resend

1. https://resend.com/domains → cliquez **iheb.com**
2. Onglet **DNS records** — copiez chaque ligne (SPF, DKIM, etc.)

## 2. GoDaddy

1. https://dcc.godaddy.com/ → **iheb.com** → **DNS** / **Manage DNS**
2. Pour chaque enregistrement Resend :
   - **Add** → Type (TXT, CNAME, MX…)
   - **Name/Host** : exactement comme Resend (souvent `send`, `resend._domainkey`, `@`)
   - **Value** : collez la valeur Resend
   - TTL : Default
3. **Save**

## 3. Attendre Verified

- Retour sur Resend → rafraîchir jusqu’à **Verified** (vert)
- Souvent 15 min–2 h ; parfois jusqu’à 48 h

## 4. Redémarrer GoRide

```powershell
cd GoRide
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"
```

## 5. Tester

- http://localhost:8081/api/test/email?to=ichraflouhichi22@gmail.com → `"sent": true`
- Inscription ou mot de passe oublié → l’utilisateur reçoit l’e-mail

## Si ça reste Pending > 24 h

- Vérifiez qu’il n’y a pas de doublons SPF en conflit
- Comparez caractère par caractère host + value avec Resend
- Support Resend : bouton Help dans le dashboard
