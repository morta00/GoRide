package com.pfeproject.GoRide.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionDTO {
    private Long id;
    private String details;
    private String type; // PAYMENT, DEPOSIT, REFUND, RECHARGE, WITHDRAWAL
    private String date; // formatted string or LocalDate
    private String method; // Carte bancaire, D17, Solde GoRide, etc.
    private Double amount;
    private String status; // PAID, BLOCKED, REFUNDED, etc.
    private String transactionId;
    private Long relatedReservationId;
    private String relatedVehicleName;
}
