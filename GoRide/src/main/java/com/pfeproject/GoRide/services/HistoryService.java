package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.HistoryItemDTO;
import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.repositories.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HistoryService {

    @Autowired
    private RentalContractRepository rentalContractRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    public List<HistoryItemDTO> getClientHistory(Long userId) {
        List<HistoryItemDTO> history = new ArrayList<>();

        // 1. Get Rentals
        List<RentalContract> rentals = rentalContractRepository.findByRenterId(userId);
        for (RentalContract r : rentals) {
            if (r.getStatus() == RentalStatus.COMPLETED || r.getStatus() == RentalStatus.CANCELLED) {
                history.add(HistoryItemDTO.builder()
                        .id(r.getId())
                        .type(r.getStatus() == RentalStatus.COMPLETED ? "RENTAL_COMPLETED" : "RENTAL_CANCELLED")
                        .title(r.getStatus() == RentalStatus.COMPLETED ? "Location " + r.getVehicle().getBrand() + " terminée" : "Réservation " + r.getVehicle().getBrand() + " annulée")
                        .description("Location du " + r.getStartDate() + " au " + r.getEndDate() + ".")
                        .vehicleName(r.getVehicle().getBrand() + " " + r.getVehicle().getModel())
                        .ownerName(r.getOwner().getFirstName() + " " + r.getOwner().getLastName())
                        .amount(r.getFinalPrice() != null ? r.getFinalPrice() : r.getTotalPrice())
                        .status(r.getStatus() == RentalStatus.COMPLETED ? "TERMINÉE" : "ANNULÉE")
                        .date(r.getCreatedAt())
                        .periodStart(r.getStartDate().toString())
                        .periodEnd(r.getEndDate().toString())
                        .relatedEntityId(r.getId())
                        .relatedEntityType("RENTAL")
                        .build());
            }

            // 2. Invoices (from completed rentals with payment status PAID)
            if ("PAID".equals(r.getPaymentStatus())) {
                history.add(HistoryItemDTO.builder()
                        .id(r.getId() + 10000) // Dummy unique ID
                        .type("INVOICE")
                        .title("Facture INV-" + r.getId() + " générée")
                        .description("Facture liée à la location " + r.getVehicle().getBrand() + ".")
                        .vehicleName(r.getVehicle().getBrand() + " " + r.getVehicle().getModel())
                        .ownerName(r.getOwner().getFirstName() + " " + r.getOwner().getLastName())
                        .amount(r.getFinalPrice() != null ? r.getFinalPrice() : r.getTotalPrice())
                        .status("DISPONIBLE")
                        .date(r.getCreatedAt().plusMinutes(1)) // Slightly after rental
                        .relatedEntityId(r.getId())
                        .relatedEntityType("INVOICE")
                        .build());
            }
        }

        // 3. Transactions (PAYMENT, REFUND)
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Transaction t : transactions) {
            if ("PAYMENT".equals(t.getType()) || "REFUND".equals(t.getType())) {
                history.add(HistoryItemDTO.builder()
                        .id(t.getId() + 20000) // Dummy unique ID
                        .type(t.getType())
                        .title(t.getType().equals("PAYMENT") ? "Paiement accepté" : "Remboursement")
                        .description(t.getTitle())
                        .amount(t.getAmount())
                        .status(t.getStatus().equals("PAID") ? "PAYÉ" : (t.getStatus().equals("REFUNDED") ? "REMBOURSÉ" : t.getStatus()))
                        .date(t.getCreatedAt())
                        .relatedEntityId(t.getId())
                        .relatedEntityType("TRANSACTION")
                        .build());
            }
        }

        // Sort by date descending
        return history.stream()
                .sorted(Comparator.comparing(HistoryItemDTO::getDate).reversed())
                .collect(Collectors.toList());
    }
}
