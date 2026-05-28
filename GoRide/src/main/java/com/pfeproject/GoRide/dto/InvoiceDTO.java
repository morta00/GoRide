package com.pfeproject.GoRide.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDTO {
    private String invoiceNumber;
    private Long reservationId;
    private String clientName;
    private String vehicleName;
    private String ownerName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String pickupLocation;
    private String returnLocation;
    private Double totalPrice;
    private Double depositAmount;
    private String paymentStatus;
    private LocalDateTime createdAt;
    private String status;
}
