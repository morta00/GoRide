package com.pfeproject.GoRide.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentSummaryDTO {
    private Double totalSpent;
    private Double blockedDeposits;
    private Double refunds;
    /** Nombre de paiements courses/location ce mois (hors recharges solde). */
    private Integer monthlyTransactionsCount;
    private Integer monthlyPaymentCount;
    /** Nombre de recharges portefeuille ce mois. */
    private Integer monthlyWalletTopups;
    private Double gorideBalance;
    private ActiveDepositDTO activeDeposit;

    /** Alias JSON pour le frontend (même valeur que gorideBalance). */
    @JsonProperty("walletBalance")
    public Double getWalletBalance() {
        return gorideBalance;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActiveDepositDTO {
        private String vehicleName;
        private Double amount;
        private String status;
        private String releaseDate;
    }
}
