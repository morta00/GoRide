package com.pfeproject.GoRide.services;

import java.util.regex.Pattern;

/** Removes credentials and internal notes from assistant replies shown to users. */
public final class AssistantResponseSanitizer {

    private static final Pattern DEMO_EMAIL = Pattern.compile(
            "[\\w.+-]*@goride\\.demo\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern DEMO_PASSWORD_LINE = Pattern.compile(
            "(?im)^.*\\b(Demo1234!?|mot de passe|password)\\b.*@?goride.*$");
    private static final Pattern DEMO_LOGIN_LINE = Pattern.compile(
            "(?im)^.*\\b(Demo login|Comptes démo|demo accounts?)\\b.*$");
    private static final Pattern GEMINI_UNAVAILABLE_NOTE = Pattern.compile(
            "(?s)\\n*_*\\s*\\(?Gemini[^)]*\\)?_*\\s*");

    private AssistantResponseSanitizer() {
    }

    public static String sanitize(String reply) {
        if (reply == null || reply.isBlank()) {
            return reply;
        }
        String s = reply;
        s = DEMO_EMAIL.matcher(s).replaceAll("[compte utilisateur]");
        s = DEMO_PASSWORD_LINE.matcher(s).replaceAll("");
        s = DEMO_LOGIN_LINE.matcher(s).replaceAll("");
        s = GEMINI_UNAVAILABLE_NOTE.matcher(s).replaceAll("");
        s = s.replaceAll("(?i)password\\s*\\*\\*Demo1234!?\\*\\*", "your password");
        s = s.replaceAll("(?i)mot de passe\\s*\\*\\*Demo1234!?\\*\\*", "votre mot de passe");
        s = s.replaceAll("\n{3,}", "\n\n");
        return s.trim();
    }
}
