package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.*;
import com.pfeproject.GoRide.services.AiRecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Recommandations intelligentes (Gemini ou règles locales) — même clé que le chatbot.
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:4200", maxAge = 3600)
public class AiRecommendationController {

    @Autowired
    private AiRecommendationService aiRecommendationService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(aiRecommendationService.status());
    }

    @PostMapping("/recommend/vehicles")
    public ResponseEntity<AiRecommendationResponse> recommendVehicles(
            @RequestBody AiVehicleRecommendRequest request) {
        return ResponseEntity.ok(aiRecommendationService.recommendVehicle(request));
    }

    @PostMapping("/recommend/trips")
    public ResponseEntity<AiRecommendationResponse> recommendTrips(
            @RequestBody AiTripRecommendRequest request) {
        return ResponseEntity.ok(aiRecommendationService.recommendTrip(request));
    }

    @PostMapping("/advise/ride")
    public ResponseEntity<AiRecommendationResponse> adviseRide(
            @RequestBody AiRideAdviceRequest request) {
        return ResponseEntity.ok(aiRecommendationService.adviseRide(request));
    }
}
