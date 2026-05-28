# GoRide — Envoyer les e-mails directement aux utilisateurs

## Ce qui a été corrigé dans le code

- `goride.mail.dev-redirect-all=false` (par défaut) → plus de redirection vers votre boîte
- Bienvenue, reset mot de passe et notifications → **adresse réelle de l'utilisateur**
- Pas de lien de reset affiché à l'écran (sécurité)

## Pourquoi ichraf ne reçoit peut-être pas encore l'e-mail

Avec **`resend.from=GoRide <onboarding@resend.dev>`** (sandbox Resend), les e-mails ne partent **que** vers l'e-mail du compte Resend, **pas** vers `ichraflouhichi22@gmail.com`.

Ce n'est pas un bug GoRide : c'est la **limite Resend** sans domaine vérifié.

## Solution A — Domaine vérifié sur Resend (recommandé en prod)

1. Allez sur https://resend.com/domains  
2. Ajoutez votre domaine (ex. `goride.tn`) et suivez les DNS  
3. Dans `application-local.properties` :

```properties
resend.from=GoRide <noreply@votredomaine.com>
```

4. Redémarrez le backend.

## Solution B — Gmail SMTP (rapide pour le PFE, envoi vers n'importe quelle adresse)

1. Activez la validation en 2 étapes sur Google  
2. Créez un **mot de passe d'application** : https://myaccount.google.com/apppasswords  
3. Dans `application-local.properties` :

```properties
goride.mail.enabled=true
goride.mail.provider=smtp
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=VOTRE@gmail.com
spring.mail.password=xxxx xxxx xxxx xxxx
goride.contact.to=VOTRE@gmail.com
```

4. Redémarrez le backend (`mvnw spring-boot:run -Dspring-boot.run.profiles=h2`)

## Vérifier que ça marche

- http://localhost:8081/api/auth/mail-status → `"directDelivery": true`  
- http://localhost:8081/api/test/email?to=ichraflouhichi22@gmail.com → `"sent": true`  
- Inscription ou « Mot de passe oublié » → l'utilisateur reçoit l'e-mail dans **sa** boîte
