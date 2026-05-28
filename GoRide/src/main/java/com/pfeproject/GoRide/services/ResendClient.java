package com.pfeproject.GoRide.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Sends transactional email via Resend HTTP API.
 * Keys: https://resend.com/api-keys
 */
@Component
public class ResendClient {

    private static final Logger log = LoggerFactory.getLogger(ResendClient.class);
    private static final String API_URL = "https://api.resend.com/emails";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${resend.api-key:}")
    private String apiKey;

    @Value("${resend.from:GoRide <onboarding@resend.dev>}")
    private String fromAddress;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * @return null on success, or a human-readable error message
     */
    public String sendHtml(String toEmail, String subject, String htmlBody) {
        if (!isConfigured()) {
            return "Clé Resend absente (resend.api-key dans application-local.properties)";
        }
        if (toEmail == null || toEmail.isBlank()) {
            return "Adresse destinataire vide";
        }

        Map<String, Object> body = Map.of(
                "from", fromAddress,
                "to", List.of(toEmail),
                "subject", subject,
                "html", htmlBody
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    API_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );
            log.info("[RESEND] Email sent to {} — status {}", toEmail, response.getStatusCode());
            return null;
        } catch (HttpStatusCodeException e) {
            String detail = e.getResponseBodyAsString();
            log.error("[RESEND] HTTP {} to {}: {}", e.getStatusCode(), toEmail, detail);
            return parseResendError(detail, e.getStatusCode().value());
        } catch (Exception e) {
            log.error("[RESEND] Failed to send to {}: {}", toEmail, e.getMessage());
            return e.getMessage();
        }
    }

    private String parseResendError(String body, int status) {
        if (body != null && body.contains("only send testing emails to your own email")) {
            return "Resend (sandbox) : impossible d'envoyer à cette adresse. "
                    + "Vérifiez un domaine sur https://resend.com/domains (resend.from=noreply@votredomaine.com) "
                    + "OU passez en SMTP Gmail/Brevo (goride.mail.provider=smtp). Voir EMAIL-ENVOI-DIRECT.md.";
        }
        if (body != null && body.contains("message")) {
            return "Resend " + status + " : " + body;
        }
        return "Resend erreur " + status;
    }
}
