package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotBlank

data class GoogleAuthRequest(@field:NotBlank val idToken: String)
