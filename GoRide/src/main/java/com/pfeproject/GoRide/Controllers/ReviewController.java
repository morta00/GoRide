package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.ReviewDTO;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.services.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private UserRepo userRepository;

    private Long getAuthenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<ReviewDTO> getReviewByReservation(@PathVariable Long reservationId) {
        ReviewDTO review = reviewService.getReviewByReservation(reservationId);
        return ResponseEntity.ok(review);
    }

    @PostMapping
    public ResponseEntity<ReviewDTO> createReview(@RequestBody ReviewDTO dto) {
        return ResponseEntity.ok(reviewService.createReview(dto, getAuthenticatedUserId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReviewDTO> updateReview(@PathVariable Long id, @RequestBody ReviewDTO dto) {
        return ResponseEntity.ok(reviewService.updateReview(id, dto, getAuthenticatedUserId()));
    }

    @GetMapping("/client/pending")
    public ResponseEntity<java.util.List<ReviewDTO>> getPendingReviews() {
        return ResponseEntity.ok(reviewService.getPendingReviews(getAuthenticatedUserId()));
    }

    @GetMapping("/client/sent")
    public ResponseEntity<java.util.List<ReviewDTO>> getSentReviews() {
        return ResponseEntity.ok(reviewService.getSentReviews(getAuthenticatedUserId()));
    }

    @PostMapping("/client/platform-feedback")
    public ResponseEntity<?> submitPlatformFeedback(@RequestBody java.util.Map<String, Object> body) {
        Integer rating = body.get("rating") instanceof Number n ? n.intValue() : null;
        String comment = body.get("comment") != null ? body.get("comment").toString() : null;
        return ResponseEntity.ok(reviewService.submitPlatformFeedback(getAuthenticatedUserId(), rating, comment));
    }

    @GetMapping("/client/platform-feedback")
    public ResponseEntity<?> getPlatformFeedbacks() {
        return ResponseEntity.ok(reviewService.getPlatformFeedbacks(getAuthenticatedUserId()));
    }
}
