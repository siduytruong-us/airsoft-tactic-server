package com.airsoft.tactic.admin.dto

import jakarta.validation.constraints.NotBlank

data class AdminLoginRequest(
    @field:NotBlank val username: String,
    @field:NotBlank val password: String
)
