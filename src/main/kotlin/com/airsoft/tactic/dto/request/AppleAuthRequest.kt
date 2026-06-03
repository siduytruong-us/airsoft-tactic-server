package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotBlank

data class AppleAuthRequest(
    @field:NotBlank val identityToken: String,
    val displayName: String?,
    val email: String?
)
