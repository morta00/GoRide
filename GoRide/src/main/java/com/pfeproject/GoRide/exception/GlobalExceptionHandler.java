package com.pfeproject.GoRide.exception;

import com.pfeproject.GoRide.dto.MessageResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        // Return the first error message as a MessageResponse for simple frontend display
        String firstError = errors.values().iterator().next();
        return ResponseEntity.badRequest().body(new MessageResponse(firstError));
    }
    
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException ex) {
        String msg = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("phone")
                ? "Ce numéro de téléphone est déjà utilisé par un autre compte."
                : "Données en conflit avec un autre compte. Vérifiez le téléphone ou l'email.";
        return ResponseEntity.badRequest().body(new MessageResponse(msg));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeExceptions(RuntimeException ex) {
        return ResponseEntity.badRequest().body(new MessageResponse(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleAllExceptions(Exception ex) {
        ex.printStackTrace(); // Log l'erreur complète dans la console backend
        return ResponseEntity.internalServerError().body(new MessageResponse("Erreur interne du serveur : " + ex.getMessage()));
    }
}
