package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TwoFactorVerifyRequest {
    @NotBlank
    private String code;
    
    // Email is needed if verifying during login
    private String email;
}
