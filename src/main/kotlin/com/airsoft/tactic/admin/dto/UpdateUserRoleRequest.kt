package com.airsoft.tactic.admin.dto

import jakarta.validation.constraints.NotBlank

data class UpdateUserRoleRequest(
    @field:NotBlank val role: String  // "player" | "admin"
)