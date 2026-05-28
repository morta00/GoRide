package com.pfeproject.GoRide.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiRecommendationResponse {
    private Long recommendedId;
    private String recommendedLabel;
    private String headline;
    private String reason;
    @Builder.Default
    private List<String> tips = new ArrayList<>();
    private String preference;
    private String provider;
    private boolean aiEnabled;
}
