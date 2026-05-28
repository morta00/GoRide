package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.HistoryItemDTO;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.UserRepo;
import com.pfeproject.GoRide.services.HistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    @Autowired
    private HistoryService historyService;

    @Autowired
    private UserRepo userRepository;

    @GetMapping("/client")
    public ResponseEntity<List<HistoryItemDTO>> getClientHistory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(historyService.getClientHistory(user.getId()));
    }
}
