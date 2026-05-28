package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.EmailSendResult;
import com.pfeproject.GoRide.services.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Contrôleur de test pour valider la configuration des emails.
 * Accessible uniquement en développement.
 */
@RestController
@RequestMapping("/api/test")
public class TestController {

    @Autowired
    private EmailService emailService;

    @GetMapping("/email")
    public ResponseEntity<?> testEmail(@RequestParam String to) {
        EmailSendResult result = emailService.sendWelcomeEmailSync(to, "Utilisateur de Test");
        return ResponseEntity.ok(Map.of(
                "sent", result.isSent(),
                "intendedRecipient", result.getIntendedRecipient(),
                "actualRecipient", result.getActualRecipient() != null ? result.getActualRecipient() : "",
                "devRedirected", result.isDevRedirected(),
                "error", result.getErrorMessage() != null ? result.getErrorMessage() : ""
        ));
    }
}
