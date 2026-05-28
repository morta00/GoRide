package com.pfeproject.GoRide.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailSendResult {
    private boolean sent;
    private String intendedRecipient;
    private String actualRecipient;
    private String errorMessage;
    private boolean devRedirected;

    public static EmailSendResult skipped(String to, String reason) {
        return EmailSendResult.builder()
                .sent(false)
                .intendedRecipient(to)
                .errorMessage(reason)
                .build();
    }

    public static EmailSendResult ok(String intended, String actual, boolean redirected) {
        return EmailSendResult.builder()
                .sent(true)
                .intendedRecipient(intended)
                .actualRecipient(actual)
                .devRedirected(redirected)
                .build();
    }
}
