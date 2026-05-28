package com.pfeproject.GoRide.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDTO {
    private Long id;
    private Long reservationId;
    private Long clientId;
    private String clientName;
    private Long vehicleId;
    private String vehicleName;
    private Long ownerId;
    private String ownerName;
    private Integer vehicleRating;
    private Integer ownerRating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
