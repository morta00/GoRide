package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.dto.InvoiceDTO;
import com.pfeproject.GoRide.dto.PaymentSummaryDTO;
import com.pfeproject.GoRide.dto.TransactionDTO;
import com.pfeproject.GoRide.entities.*;
import com.pfeproject.GoRide.repositories.RentalContractRepository;
import com.pfeproject.GoRide.repositories.TransactionRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private RentalContractRepository rentalContractRepository;

    @Autowired
    private UserRepo userRepository;

    @Autowired
    private com.pfeproject.GoRide.repositories.VehicleRepository vehicleRepository;

    public PaymentSummaryDTO getPaymentSummary(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        double walletBalance = reconcileWalletBalance(user, transactions);
        
        Double totalSpent = 0.0;
        Double blockedDeposits = 0.0;
        Double refunds = 0.0;
        int monthlyPayments = 0;
        int monthlyWalletTopups = 0;
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);

        PaymentSummaryDTO.ActiveDepositDTO activeDeposit = null;

        for (Transaction t : transactions) {
            if (t.getCreatedAt().isAfter(startOfMonth)) {
                if (isWalletTopupTransaction(t)) {
                    monthlyWalletTopups++;
                } else if (isRideOrRentalPayment(t)) {
                    monthlyPayments++;
                }
            }
            if ("PAYMENT".equals(t.getType()) && t.getAmount() < 0) {
                totalSpent += Math.abs(t.getAmount());
            }
            if ("DEPOSIT".equals(t.getType()) && "BLOCKED".equals(t.getStatus())) {
                blockedDeposits += Math.abs(t.getAmount());
                if (activeDeposit == null) {
                    activeDeposit = PaymentSummaryDTO.ActiveDepositDTO.builder()
                            .vehicleName(t.getTitle().replace("Caution ", "")) // Simplistic extraction
                            .amount(Math.abs(t.getAmount()))
                            .status(t.getStatus())
                            .releaseDate(t.getCreatedAt().plusDays(3).toLocalDate().toString())
                            .build();
                }
            }
            if ("REFUND".equals(t.getType()) && t.getAmount() > 0) {
                refunds += t.getAmount();
            }
        }

        return PaymentSummaryDTO.builder()
                .totalSpent(totalSpent)
                .blockedDeposits(blockedDeposits)
                .refunds(refunds)
                .monthlyTransactionsCount(monthlyPayments)
                .monthlyPaymentCount(monthlyPayments)
                .monthlyWalletTopups(monthlyWalletTopups)
                .gorideBalance(walletBalance)
                .activeDeposit(activeDeposit)
                .build();
    }

    private boolean isWalletTopupTransaction(Transaction t) {
        if (t == null || t.getType() == null) {
            return t != null && t.getTitle() != null
                    && t.getTitle().toLowerCase().contains("recharge solde");
        }
        String type = t.getType().toUpperCase();
        if ("WALLET_TOPUP".equals(type) || "TOPUP".equals(type) || "RECHARGE".equals(type)) {
            return true;
        }
        return t.getTitle() != null && t.getTitle().toLowerCase().contains("recharge solde");
    }

    private boolean isRideOrRentalPayment(Transaction t) {
        if (t == null || t.getType() == null) {
            return false;
        }
        String type = t.getType().toUpperCase();
        return "PAYMENT".equals(type) || "SHARED_RIDE_PAYMENT".equals(type) || "SHARED".equals(type);
    }

    @Transactional
    public TransactionDTO rechargeWallet(Long userId, double amount, String method) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Le montant doit être supérieur à zéro");
        }
        if (amount > 10_000) {
            throw new IllegalArgumentException("Le montant maximum de recharge est de 10 000 DT");
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        double current = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;
        user.setWalletBalance(current + amount);
        userRepository.save(user);

        String safeMethod = method != null && !method.isBlank() ? method : "Carte bancaire";
        Transaction tx = transactionRepository.save(Transaction.builder()
                .title("Recharge solde GoRide")
                .type("WALLET_TOPUP")
                .amount(amount)
                .status("PAID")
                .transactionId("WLT-" + System.currentTimeMillis())
                .createdAt(LocalDateTime.now())
                .user(user)
                .build());

        TransactionDTO dto = mapToTransactionDto(tx);
        dto.setMethod(safeMethod);
        dto.setDetails("Recharge portefeuille GoRide via " + safeMethod);
        return dto;
    }

    /**
     * Aligne le solde utilisateur sur la somme des recharges WALLET_TOPUP payées
     * (corrige les cas où la transaction existe mais wallet_balance n'a pas été persisté).
     */
    private double reconcileWalletBalance(UserEntity user, List<Transaction> transactions) {
        double stored = user.getWalletBalance() != null ? user.getWalletBalance() : 0.0;
        double fromTopups = transactions.stream()
                .filter(t -> "WALLET_TOPUP".equalsIgnoreCase(t.getType()))
                .filter(t -> "PAID".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(t -> Math.abs(t.getAmount() != null ? t.getAmount() : 0.0))
                .sum();
        if (fromTopups > stored + 0.001) {
            user.setWalletBalance(fromTopups);
            userRepository.saveAndFlush(user);
            return fromTopups;
        }
        return stored;
    }

    public List<TransactionDTO> getTransactions(Long userId) {
        List<Transaction> transactions = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return transactions.stream().map(this::mapToTransactionDto).collect(Collectors.toList());
    }

    public TransactionDTO getTransactionDetails(Long id, Long userId) {
        Transaction t = transactionRepository.findById(id).orElseThrow(() -> new RuntimeException("Transaction not found"));
        if (!t.getUser().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        return mapToTransactionDto(t);
    }

    public List<InvoiceDTO> getInvoices(Long userId) {
        List<RentalContract> contracts = rentalContractRepository.findByRenterId(userId);
        return contracts.stream()
                .filter(c -> "PAID".equals(c.getPaymentStatus()))
                .map(this::mapToInvoiceDto)
                .collect(Collectors.toList());
    }

    public InvoiceDTO getInvoiceDetails(Long id, Long userId) {
        RentalContract c = rentalContractRepository.findById(id).orElseThrow(() -> new RuntimeException("Invoice not found"));
        if (!c.getRenter().getId().equals(userId)) {
            throw new RuntimeException("Access denied");
        }
        return mapToInvoiceDto(c);
    }

    private TransactionDTO mapToTransactionDto(Transaction t) {
        // Here we can map methods that were previously mocked
        String method = "Carte bancaire";
        if ("WALLET_TOPUP".equalsIgnoreCase(t.getType())) {
            method = "Recharge portefeuille";
        } else if (t.getTitle().contains("Caution")) {
            method = "D17";
        } else if (t.getTitle().contains("Remboursement")) {
            method = "Solde GoRide";
        }

        double displayAmount = t.getAmount() != null ? t.getAmount() : 0.0;
        if ("PAYMENT".equalsIgnoreCase(t.getType()) && displayAmount > 0) {
            displayAmount = -displayAmount;
        }

        return TransactionDTO.builder()
                .id(t.getId())
                .details(t.getTitle())
                .type(t.getType())
                .date(t.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm")))
                .method(method)
                .amount(displayAmount)
                .status(t.getStatus())
                .transactionId(t.getTransactionId())
                .build();
    }

    private InvoiceDTO mapToInvoiceDto(RentalContract c) {
        return InvoiceDTO.builder()
                .invoiceNumber("INV-" + c.getId())
                .reservationId(c.getId())
                .clientName(c.getRenter().getFirstName() + " " + c.getRenter().getLastName())
                .vehicleName(c.getVehicle().getBrand() + " " + c.getVehicle().getModel())
                .ownerName(c.getOwner().getFirstName() + " " + c.getOwner().getLastName())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .pickupLocation(c.getPickupLocation())
                .returnLocation(c.getReturnLocation())
                .totalPrice(c.getFinalPrice() != null ? c.getFinalPrice() : c.getTotalPrice())
                .depositAmount(500.0) // Mock deposit
                .paymentStatus(c.getPaymentStatus())
                .createdAt(c.getCreatedAt())
                .status("PAID")
                .build();
    }

    @PostConstruct
    public void seedTestData() {
        // Seeding user id 5
        userRepository.findById(5L).ifPresent(user -> {
            List<Transaction> existing = transactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
            if (existing.isEmpty()) {
                // Seed Transaction 1
                transactionRepository.save(Transaction.builder()
                        .title("Paiement location BMW Série 3")
                        .type("PAYMENT")
                        .amount(-250.0)
                        .status("PAID")
                        .transactionId("TRX-001")
                        .createdAt(LocalDateTime.of(2026, 5, 11, 10, 0))
                        .user(user)
                        .build());
                        
                // Seed Transaction 2
                transactionRepository.save(Transaction.builder()
                        .title("Caution BMW Série 3")
                        .type("DEPOSIT")
                        .amount(-500.0)
                        .status("BLOCKED")
                        .transactionId("TRX-002")
                        .createdAt(LocalDateTime.of(2026, 5, 11, 10, 5))
                        .user(user)
                        .build());
 
                // Seed Transaction 3
                transactionRepository.save(Transaction.builder()
                        .title("Remboursement annulation Toyota Yaris")
                        .type("REFUND")
                        .amount(90.0)
                        .status("REFUNDED")
                        .transactionId("TRX-003")
                        .createdAt(LocalDateTime.of(2026, 5, 3, 14, 30))
                        .user(user)
                        .build());
 
                // Seed Transaction 4
                transactionRepository.save(Transaction.builder()
                        .title("Paiement location Renault Clio")
                        .type("PAYMENT")
                        .amount(-180.0)
                        .status("PAID")
                        .transactionId("TRX-004")
                        .createdAt(LocalDateTime.of(2026, 5, 10, 9, 15))
                        .user(user)
                        .build());
            }

            List<RentalContract> existingRentals = rentalContractRepository.findByRenterId(user.getId());
            if (existingRentals.isEmpty()) {
                // Get or create a vehicle
                Vehicle v = vehicleRepository.findAll().stream().findFirst().orElseGet(() -> {
                    Vehicle nv = Vehicle.builder()
                            .brand("BMW")
                            .model("Série 3")
                            .licensePlate("123-TUN-456")
                            .dailyPrice(125.0)
                            .owner(user) // In a real app, the owner would be different
                            .status(VehicleStatus.AVAILABLE)
                            .build();
                    return vehicleRepository.save(nv);
                });

                Vehicle v2 = Vehicle.builder()
                        .brand("Renault")
                        .model("Clio")
                        .licensePlate("789-TUN-012")
                        .dailyPrice(90.0)
                        .owner(user)
                        .status(VehicleStatus.AVAILABLE)
                        .build();
                if (!vehicleRepository.existsByLicensePlate(v2.getLicensePlate())) {
                    v2 = vehicleRepository.save(v2);
                } else {
                    v2 = vehicleRepository.findAll().stream().filter(veh -> veh.getLicensePlate().equals("789-TUN-012")).findFirst().get();
                }

                Vehicle v3 = Vehicle.builder()
                        .brand("Hyundai")
                        .model("i20")
                        .licensePlate("345-TUN-678")
                        .dailyPrice(80.0)
                        .owner(user)
                        .status(VehicleStatus.AVAILABLE)
                        .build();
                if (!vehicleRepository.existsByLicensePlate(v3.getLicensePlate())) {
                    v3 = vehicleRepository.save(v3);
                } else {
                    v3 = vehicleRepository.findAll().stream().filter(veh -> veh.getLicensePlate().equals("345-TUN-678")).findFirst().get();
                }

                Vehicle v4 = Vehicle.builder()
                        .brand("Toyota")
                        .model("Yaris")
                        .licensePlate("901-TUN-234")
                        .dailyPrice(85.0)
                        .owner(user)
                        .status(VehicleStatus.AVAILABLE)
                        .build();
                if (!vehicleRepository.existsByLicensePlate(v4.getLicensePlate())) {
                    v4 = vehicleRepository.save(v4);
                } else {
                    v4 = vehicleRepository.findAll().stream().filter(veh -> veh.getLicensePlate().equals("901-TUN-234")).findFirst().get();
                }

                // Seed Rental 1: Hyundai i20 terminée
                rentalContractRepository.save(RentalContract.builder()
                        .renter(user)
                        .owner(user)
                        .vehicle(v3)
                        .startDate(LocalDate.of(2026, 5, 5))
                        .endDate(LocalDate.of(2026, 5, 7))
                        .totalPrice(160.0)
                        .finalPrice(160.0)
                        .status(RentalStatus.COMPLETED)
                        .paymentStatus("PAID")
                        .pickupLocation("Tunis Centre")
                        .returnLocation("Tunis Centre")
                        .createdAt(LocalDateTime.of(2026, 5, 4, 10, 0))
                        .build());

                // Seed Rental 2: Renault Clio terminée
                rentalContractRepository.save(RentalContract.builder()
                        .renter(user)
                        .owner(user)
                        .vehicle(v2)
                        .startDate(LocalDate.of(2026, 5, 10))
                        .endDate(LocalDate.of(2026, 5, 12))
                        .totalPrice(180.0)
                        .finalPrice(180.0)
                        .status(RentalStatus.COMPLETED)
                        .paymentStatus("PAID")
                        .pickupLocation("Ariana")
                        .returnLocation("Ariana")
                        .createdAt(LocalDateTime.of(2026, 5, 9, 15, 0))
                        .build());

                // Seed Rental 3: Toyota Yaris annulée
                rentalContractRepository.save(RentalContract.builder()
                        .renter(user)
                        .owner(user)
                        .vehicle(v4)
                        .startDate(LocalDate.of(2026, 5, 2))
                        .endDate(LocalDate.of(2026, 5, 4))
                        .totalPrice(170.0)
                        .status(RentalStatus.CANCELLED)
                        .paymentStatus("REFUNDED")
                        .createdAt(LocalDateTime.of(2026, 5, 1, 10, 0))
                        .build());
            }
        });
    }
}
