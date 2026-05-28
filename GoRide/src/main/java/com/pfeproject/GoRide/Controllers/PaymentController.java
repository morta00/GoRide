package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.InvoiceDTO;
import com.pfeproject.GoRide.dto.PaymentSummaryDTO;
import com.pfeproject.GoRide.dto.TransactionDTO;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.services.PaymentService;
import com.pfeproject.GoRide.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private UserService userService;

    private UserEntity getAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userService.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/summary")
    public ResponseEntity<PaymentSummaryDTO> getSummary() {
        try {
            UserEntity user = getAuthenticatedUser();
            return ResponseEntity.ok(paymentService.getPaymentSummary(user.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionDTO>> getTransactions() {
        try {
            UserEntity user = getAuthenticatedUser();
            return ResponseEntity.ok(paymentService.getTransactions(user.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<InvoiceDTO>> getInvoices() {
        try {
            UserEntity user = getAuthenticatedUser();
            return ResponseEntity.ok(paymentService.getInvoices(user.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<TransactionDTO> getTransactionDetails(@PathVariable Long id) {
        try {
            UserEntity user = getAuthenticatedUser();
            return ResponseEntity.ok(paymentService.getTransactionDetails(id, user.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<InvoiceDTO> getInvoiceDetails(@PathVariable Long id) {
        try {
            UserEntity user = getAuthenticatedUser();
            return ResponseEntity.ok(paymentService.getInvoiceDetails(id, user.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/wallet/recharge")
    public ResponseEntity<?> rechargeWallet(@RequestBody Map<String, Object> body) {
        try {
            UserEntity user = getAuthenticatedUser();
            Object amountObj = body.get("amount");
            if (!(amountObj instanceof Number)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Montant invalide"));
            }
            double amount = ((Number) amountObj).doubleValue();
            String method = body.get("method") != null ? body.get("method").toString() : "Carte bancaire";
            TransactionDTO tx = paymentService.rechargeWallet(user.getId(), amount, method);
            PaymentSummaryDTO summary = paymentService.getPaymentSummary(user.getId());
            return ResponseEntity.ok(Map.of(
                    "transaction", tx,
                    "summary", summary,
                    "gorideBalance", summary.getGorideBalance(),
                    "walletBalance", summary.getGorideBalance()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }
}
