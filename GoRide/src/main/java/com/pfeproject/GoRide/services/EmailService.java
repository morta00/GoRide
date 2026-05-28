package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.EmailSendResult;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Emails via Resend (recommended) or SMTP. Auth emails use synchronous send with explicit result.
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private ResendClient resendClient;

    @Autowired
    private AppLinkService appLinkService;

    @Value("${goride.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${goride.mail.provider:resend}")
    private String mailProvider;

    @Value("${spring.mail.username:}")
    private String smtpFromEmail;

    @Value("${app.base-url:http://localhost:4200}")
    private String appBaseUrl;

    /** Optionnel : copie de secours si Resend bloque (ne pas utiliser pour la prod). */
    @Value("${goride.mail.dev-redirect-to:}")
    private String devRedirectTo;

    /** Si true, tous les mails vont vers dev-redirect-to (désactivé par défaut = envoi direct). */
    @Value("${goride.mail.dev-redirect-all:false}")
    private boolean devRedirectAll;

    @Value("${goride.mail.try-smtp-fallback:true}")
    private boolean trySmtpFallback;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    private boolean smtpConfigured() {
        return smtpFromEmail != null && !smtpFromEmail.isBlank()
                && smtpPassword != null && !smtpPassword.isBlank();
    }

    private boolean canSendMail() {
        if (!mailEnabled) {
            return false;
        }
        if ("smtp".equalsIgnoreCase(mailProvider)) {
            return smtpConfigured();
        }
        if ("resend".equalsIgnoreCase(mailProvider)) {
            return resendClient.isConfigured() || smtpConfigured();
        }
        return smtpConfigured();
    }

    public boolean isMailConfigured() {
        return canSendMail();
    }

    public String getDevRedirectTo() {
        return devRedirectTo != null && !devRedirectTo.isBlank() ? devRedirectTo.trim() : null;
    }

    public boolean isDevRedirectAll() {
        return devRedirectAll;
    }

    public void logDirectLink(String action, String url) {
        logger.info("[GORIDE LINK] {} → {}", action, url);
    }

    private String absoluteUrl(String targetUrl) {
        if (targetUrl == null || targetUrl.isBlank()) {
            return appBaseUrl;
        }
        if (targetUrl.startsWith("http")) {
            return targetUrl;
        }
        String base = appBaseUrl.endsWith("/") ? appBaseUrl.substring(0, appBaseUrl.length() - 1) : appBaseUrl;
        return targetUrl.startsWith("/") ? base + targetUrl : base + "/" + targetUrl;
    }

    private String wrapHtml(String title, String bodyHtml, String buttonLabel, String buttonUrl) {
        return "<html><body style='font-family:Arial,sans-serif;line-height:1.6;color:#333;'>" +
                "<div style='max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;'>" +
                "<div style='background:linear-gradient(135deg,#2563eb,#1e40af);padding:24px;text-align:center;'>" +
                "<h1 style='color:#fff;margin:0;'>GoRide</h1></div>" +
                "<div style='padding:24px;'><h2 style='margin-top:0;'>" + escapeHtml(title) + "</h2>" +
                bodyHtml +
                (buttonUrl != null ? "<p style='text-align:center;margin-top:28px;'>" +
                        "<a href='" + buttonUrl + "' style='background:#2563eb;color:#fff;padding:12px 24px;" +
                        "text-decoration:none;border-radius:8px;font-weight:bold;'>" + escapeHtml(buttonLabel) + "</a></p>" : "") +
                "</div></div></body></html>";
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String applyDevRedirect(String intendedTo, String html) {
        String redirect = getDevRedirectTo();
        if (redirect == null || intendedTo == null || intendedTo.equalsIgnoreCase(redirect)) {
            return html;
        }
        return "<p style='background:#fef3c7;padding:12px;border-radius:8px;font-size:14px;'>"
                + "<strong>Mode test GoRide</strong> — e-mail destiné à : <em>" + escapeHtml(intendedTo) + "</em></p>"
                + html;
    }

    private boolean isResendTestRestriction(String err) {
        if (err == null) {
            return false;
        }
        String e = err.toLowerCase();
        return e.contains("testing") || e.contains("only send") || e.contains("verify a domain")
                || e.contains("not authorized") || e.contains("validation_error")
                || e.contains("mode test");
    }

    /**
     * Par défaut : envoi direct au destinataire. Redirection dev uniquement si goride.mail.dev-redirect-all=true.
     */
    private record MailTarget(String to, String subject, String html, boolean devRedirected) {}

    private MailTarget resolveMailTarget(String intendedTo, String subject, String html) {
        if (!devRedirectAll) {
            return new MailTarget(intendedTo, subject, html, false);
        }
        String redirect = getDevRedirectTo();
        if (redirect != null && intendedTo != null && !intendedTo.equalsIgnoreCase(redirect)) {
            return new MailTarget(
                    redirect,
                    subject + " [GoRide → " + intendedTo + "]",
                    applyDevRedirect(intendedTo, html),
                    true);
        }
        return new MailTarget(intendedTo, subject, html, false);
    }

    public EmailSendResult sendHtmlSync(String intendedTo, String subject, String html) {
        if (!canSendMail()) {
            return EmailSendResult.skipped(intendedTo,
                    "E-mail désactivé. Configurez resend.api-key ou SMTP dans application-local.properties");
        }
        if ("smtp".equalsIgnoreCase(mailProvider)) {
            return sendViaSmtp(intendedTo, subject, html);
        }
        MailTarget target = resolveMailTarget(intendedTo, subject, html);
        try {
            if ("resend".equalsIgnoreCase(mailProvider) && resendClient.isConfigured()) {
                String err = resendClient.sendHtml(target.to(), target.subject(), target.html());
                if (err == null) {
                    logger.info("[EMAIL] Resend sent '{}' → {}", target.subject(), target.to());
                    return EmailSendResult.ok(intendedTo, target.to(), target.devRedirected());
                }
                logger.warn("[EMAIL] Resend failed for {}: {}", intendedTo, err);
                if (!target.devRedirected() && isResendTestRestriction(err)) {
                    String redirect = getDevRedirectTo();
                    if (redirect != null && intendedTo != null && !intendedTo.equalsIgnoreCase(redirect)) {
                        MailTarget fallback = new MailTarget(
                                redirect,
                                subject + " [GoRide → " + intendedTo + "]",
                                applyDevRedirect(intendedTo, html),
                                true);
                        String retryErr = resendClient.sendHtml(fallback.to(), fallback.subject(), fallback.html());
                        if (retryErr == null) {
                            logger.info("[EMAIL] Resend sandbox redirect sent '{}' → {} (intended {})",
                                    fallback.subject(), fallback.to(), intendedTo);
                            return EmailSendResult.ok(intendedTo, fallback.to(), true);
                        }
                        err = retryErr;
                    }
                }
                if (trySmtpFallback && smtpConfigured() && !target.devRedirected()) {
                    EmailSendResult smtp = sendViaSmtp(intendedTo, subject, html);
                    if (smtp.isSent()) {
                        return smtp;
                    }
                }
                return EmailSendResult.builder()
                        .sent(false)
                        .intendedRecipient(intendedTo)
                        .errorMessage(err + " — Sans domaine : activez goride.mail.dev-redirect-all=true et goride.mail.dev-redirect-to=votre@email (compte Resend).")
                        .build();
            }
            return sendViaSmtp(target.to(), target.subject(), target.html());
        } catch (Exception e) {
            logger.error("[EMAIL] Send failed to {}: {}", intendedTo, e.getMessage());
            return EmailSendResult.builder()
                    .sent(false)
                    .intendedRecipient(intendedTo)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private EmailSendResult sendViaSmtp(String toEmail, String subject, String html) {
        if (!smtpConfigured()) {
            return EmailSendResult.skipped(toEmail, "SMTP non configuré (spring.mail.username + spring.mail.password)");
        }
        try {
            sendSmtpHtml(toEmail, subject, html);
            logger.info("[EMAIL] SMTP sent '{}' → {}", subject, toEmail);
            return EmailSendResult.ok(toEmail, toEmail, false);
        } catch (Exception e) {
            logger.error("[EMAIL] SMTP failed to {}: {}", toEmail, e.getMessage());
            return EmailSendResult.builder()
                    .sent(false)
                    .intendedRecipient(toEmail)
                    .errorMessage("SMTP : " + e.getMessage())
                    .build();
        }
    }

    private void dispatchAsync(String toEmail, String subject, String html) {
        sendHtmlSync(toEmail, subject, html);
    }

    private void sendSmtpHtml(String toEmail, String subject, String html)
            throws MessagingException, UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(smtpFromEmail, "GoRide Team");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(message);
    }

    @Async
    public void sendNotificationEmail(String toEmail, String firstName, String title, String message, String targetUrl) {
        String link = absoluteUrl(targetUrl);
        logDirectLink(title, link);
        String name = firstName != null && !firstName.isBlank() ? firstName : "there";
        String html = wrapHtml(title,
                "<p>Bonjour " + escapeHtml(name) + ",</p><p>" + escapeHtml(message) + "</p>",
                "Ouvrir dans GoRide",
                link);
        dispatchAsync(toEmail, "GoRide — " + title, html);
    }

    public void sendPlainEmail(String toEmail, String subject, String textBody)
            throws MessagingException, UnsupportedEncodingException {
        String html = wrapHtml(subject, "<p>" + escapeHtml(textBody).replace("\n", "<br>") + "</p>", null, null);
        sendHtmlSync(toEmail, subject, html);
    }

    @Async
    public void sendRentalConfirmationEmail(String toEmail, String firstName, String vehicleName, Long reservationId) {
        String link = appLinkService.clientReservation(reservationId);
        sendNotificationEmail(toEmail, firstName,
                "Demande de location enregistrée",
                "Votre demande pour " + vehicleName + " (réf. #" + reservationId + ") est en attente.",
                "/client/reservations/" + reservationId);
    }

    public EmailSendResult sendPasswordResetEmailSync(String toEmail, String firstName, String token) {
        String resetUrl = appLinkService.passwordReset(token);
        logDirectLink("Réinitialisation mot de passe", resetUrl);
        String html = wrapHtml("Réinitialisation du mot de passe",
                "<p>Bonjour " + escapeHtml(firstName != null ? firstName : "") + ",</p>" +
                        "<p>Vous avez demandé un <strong>nouveau mot de passe</strong> sur GoRide.</p>" +
                        "<p>Cliquez le bouton ci-dessous (lien valable <strong>15 minutes</strong>). " +
                        "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>" +
                        "<p style='word-break:break-all;font-size:13px;color:#2563eb;'>" + escapeHtml(resetUrl) + "</p>",
                "Choisir un nouveau mot de passe",
                resetUrl);
        return sendHtmlSync(toEmail, "Réinitialisation mot de passe GoRide", html);
    }

    public EmailSendResult sendWelcomeEmailSync(String toEmail, String firstName) {
        logDirectLink("Bienvenue", appLinkService.login());
        String html = wrapHtml("Bienvenue sur GoRide",
                "<p>Bonjour " + escapeHtml(firstName) + " !</p>" +
                        "<p>Votre <strong>compte a été créé</strong>. Ce message n'est pas une réinitialisation de mot de passe.</p>" +
                        "<p>Réservez des trajets, louez un véhicule ou commandez un chauffeur.</p>" +
                        "<p style='font-size:13px;color:#64748b;'>Mot de passe oublié ? Utilisez « Mot de passe oublié » sur la page de connexion.</p>",
                "Se connecter à GoRide",
                appLinkService.login());
        return sendHtmlSync(toEmail, "Bienvenue sur GoRide", html);
    }
}
