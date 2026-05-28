package com.pfeproject.GoRide.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoryItemDTO {
    private Long id;
    private String type; // RENTAL_COMPLETED, RENTAL_CANCELLED, PAYMENT, REFUND, INVOICE
    private String title;
    private String description;
    private String vehicleName;
    private String ownerName;
    private Double amount;
    private String status;
    private LocalDateTime date;
    private String periodStart;
    private String periodEnd;
    private Long relatedEntityId;
    private String relatedEntityType;
}
