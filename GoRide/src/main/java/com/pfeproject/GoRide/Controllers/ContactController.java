package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.ContactRequest;
import com.pfeproject.GoRide.services.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = "http://localhost:4200")
public class ContactController {

    @Autowired
    private EmailService emailService;

    @Value("${goride.contact.to:}")
    private String contactTo;

    @PostMapping
    public ResponseEntity<Map<String, String>> receiveContactMessage(@RequestBody ContactRequest request) {
        String to = (contactTo != null && !contactTo.isBlank())
                ? contactTo
                : System.getenv("GORIDE_CONTACT_EMAIL");

        if (to != null && !to.isBlank()) {
            try {
                String subject = "[GoRide Contact] " + (request.getSubject() != null ? request.getSubject() : "Message");
                String body = "Nom: " + request.getName() + "\n"
                        + "Email: " + request.getEmail() + "\n"
                        + "Sujet: " + request.getSubject() + "\n\n"
                        + request.getMessage();
                emailService.sendPlainEmail(to, subject, body);
            } catch (Exception e) {
                System.err.println("[Contact] Email send failed: " + e.getMessage());
            }
        }

        Map<String, String> response = new HashMap<>();
        response.put("message", "Votre demande a été envoyée avec succès. Notre équipe vous contactera sous peu.");
        return ResponseEntity.ok(response);
    }
}
