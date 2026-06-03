package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.Size

data class UpdateProfileRequest(
    @field:Size(min = 1, max = 32, message = "displayName must be 1-32 characters")
    val displayName: String?,
    val avatarUrl: String?
)
