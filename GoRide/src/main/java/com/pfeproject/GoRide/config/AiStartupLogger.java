package com.pfeproject.GoRide.config;

import com.pfeproject.GoRide.services.GeminiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AiStartupLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AiStartupLogger.class);

    @Value("${goride.ai.provider:local}")
    private String provider;

    private final GeminiService geminiService;

    public AiStartupLogger(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (geminiService.isGeminiActive()) {
            log.info("[GoRide AI] Chatbot: Gemini ENABLED (provider={})", provider);
        } else if (geminiService.hasApiKey()) {
            log.warn("[GoRide AI] Chatbot: Gemini key present but provider={} — set goride.ai.provider=gemini", provider);
        } else {
            log.info("[GoRide AI] Chatbot: smart database replies only (no Gemini key)");
        }
    }
}
