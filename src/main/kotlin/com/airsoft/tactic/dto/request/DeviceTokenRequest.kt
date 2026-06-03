package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotBlank

data class DeviceTokenRequest(
    @field:NotBlank val token: String,
    @field:NotBlank val platform: String
)
