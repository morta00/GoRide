package com.pfeproject.GoRide.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AssistantChatRequest {
    private String message;
    /** fr or en */
    private String locale = "fr";
    /** Previous turns (user + assistant), max ~10 recommended */
    private List<AssistantChatMessage> history = new ArrayList<>();
}
