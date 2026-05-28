package com.pfeproject.GoRide.Controllers;

import com.pfeproject.GoRide.dto.AssistantChatRequest;
import com.pfeproject.GoRide.dto.AssistantChatResponse;
import com.pfeproject.GoRide.services.AssistantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    @Autowired
    private AssistantService assistantService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(assistantService.status());
    }

    @PostMapping("/chat")
    public ResponseEntity<AssistantChatResponse> chat(@RequestBody AssistantChatRequest request) {
        AssistantChatResponse response = assistantService.chat(
                request.getMessage(),
                request.getLocale() != null ? request.getLocale() : "fr",
                request.getHistory());
        return ResponseEntity.ok(response);
    }
}
