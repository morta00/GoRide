package com.pfeproject.GoRide.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleRequest {
    @NotBlank
    private String role;
}
