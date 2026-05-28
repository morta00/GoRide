package com.pfeproject.GoRide.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatResponse {
    private String reply;
    /** local | gemini */
    private String provider;
    private boolean aiEnabled;
}
