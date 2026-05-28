package com.pfeproject.GoRide.dto;

import lombok.Data;

@Data
public class AssistantChatMessage {
    /** user | assistant */
    private String role;
    private String content;
}
