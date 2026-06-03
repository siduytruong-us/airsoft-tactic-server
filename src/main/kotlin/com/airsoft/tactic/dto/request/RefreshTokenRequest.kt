package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotBlank

data class RefreshTokenRequest(@field:NotBlank val refreshToken: String)
