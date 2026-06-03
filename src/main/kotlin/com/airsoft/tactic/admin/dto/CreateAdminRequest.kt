package com.airsoft.tactic.admin.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CreateAdminRequest(
    @field:NotBlank
    val username: String,

    @field:NotBlank
    @field:Size(min = 8, message = "Password must be at least 8 characters")
    val password: String,

    val displayName: String = "Admin"
)
