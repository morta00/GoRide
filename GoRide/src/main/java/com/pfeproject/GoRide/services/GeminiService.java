package com.pfeproject.GoRide.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pfeproject.GoRide.dto.AssistantChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Client Google Gemini (goride.ai.gemini-api-key).
 */
@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final Pattern JSON_BLOCK = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);

    private static final List<String> MODEL_FALLBACKS = List.of(
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b"
    );

    @Value("${goride.ai.provider:local}")
    private String provider;

    @Value("${goride.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${goride.ai.gemini-model:gemini-2.0-flash}")
    private String geminiModel;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isGeminiActive() {
        boolean hasKey = geminiApiKey != null && !geminiApiKey.isBlank();
        if (!hasKey) {
            return false;
        }
        return "gemini".equalsIgnoreCase(provider) || "auto".equalsIgnoreCase(provider);
    }

    public boolean hasApiKey() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }

    public String getActiveModelName() {
        if (geminiModel != null && !geminiModel.isBlank()) {
            return geminiModel.trim();
        }
        return MODEL_FALLBACKS.get(0);
    }

    public String generateText(String systemPrompt, String userPrompt) throws Exception {
        return chat(systemPrompt, userPrompt, List.of());
    }

    /**
     * Multi-turn chat with system instruction (Gemini generateContent API).
     */
    public String chat(String systemInstruction, String userMessage, List<AssistantChatMessage> history) throws Exception {
        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (AssistantChatMessage msg : history) {
                if (msg == null || msg.getContent() == null || msg.getContent().isBlank()) {
                    continue;
                }
                String role = normalizeRole(msg.getRole());
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", msg.getContent().trim()))
                ));
            }
        }
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage.trim()))
        ));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        body.put("contents", contents);
        body.put("generationConfig", Map.of(
                "temperature", 0.85,
                "maxOutputTokens", 4096,
                "topP", 0.92,
                "topK", 40
        ));

        List<String> modelsToTry = buildModelList();
        Exception lastError = null;
        for (String model : modelsToTry) {
            try {
                return callGeminiModel(model, body);
            } catch (Exception e) {
                lastError = e;
                log.warn("[Gemini] Model {} failed: {}", model, e.getMessage());
                if (isRateLimited(e)) {
                    throw e;
                }
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        throw new IllegalStateException("No Gemini model available");
    }

    public JsonNode generateJson(String systemPrompt, String userPrompt) throws Exception {
        String jsonPrompt = systemPrompt + "\n\nRépondez UNIQUEMENT avec un objet JSON valide, sans markdown.\n\n" + userPrompt;
        return objectMapper.readTree(extractJson(chat(jsonPrompt, "Réponds maintenant.", List.of())));
    }

    private List<String> buildModelList() {
        List<String> models = new ArrayList<>();
        if (geminiModel != null && !geminiModel.isBlank()) {
            models.add(geminiModel.trim());
        }
        for (String m : MODEL_FALLBACKS) {
            if (!models.contains(m)) {
                models.add(m);
            }
        }
        return models;
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "user";
        }
        String r = role.toLowerCase().trim();
        if ("assistant".equals(r) || "model".equals(r) || "bot".equals(r)) {
            return "model";
        }
        return "user";
    }

    private String callGeminiModel(String model, Map<String, Object> body) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + geminiApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            return extractTextFromResponse(response.getBody());
        } catch (HttpStatusCodeException e) {
            String detail = e.getResponseBodyAsString();
            log.error("[Gemini] HTTP {} model={} body={}", e.getStatusCode(), model, truncate(detail, 500));
            throw new IllegalStateException("Gemini API error (" + e.getStatusCode() + "): " + truncate(detail, 200));
        }
    }

    private String extractTextFromResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && !candidates.isEmpty()) {
            JsonNode text = candidates.path(0).path("content").path("parts").path(0).path("text");
            if (!text.isMissingNode() && !text.asText().isBlank()) {
                return text.asText().trim();
            }
        }
        JsonNode err = root.path("error").path("message");
        if (!err.isMissingNode()) {
            throw new IllegalStateException("Gemini: " + err.asText());
        }
        throw new IllegalStateException("Empty Gemini response");
    }

    private String extractJson(String raw) {
        if (raw == null) {
            return "{}";
        }
        String trimmed = raw.trim();
        Matcher m = JSON_BLOCK.matcher(trimmed);
        if (m.find()) {
            return m.group(1).trim();
        }
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private static boolean isRateLimited(Exception e) {
        String m = e.getMessage();
        return m != null && (m.contains("429") || m.toLowerCase().contains("too many"));
    }

    private static void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
