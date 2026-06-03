package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern

data class PingRequest(
    @field:NotNull(message = "latitude không được để trống")
    val latitude: Double,

    @field:NotNull(message = "longitude không được để trống")
    val longitude: Double,

    @field:NotBlank(message = "pingType không được để trống")
    @field:Pattern(
        regexp = "^(ENEMY_SPOTTED|CAUTION|OBJECTIVE|HELP_ME|FLANKING)$",
        message = "pingType phải là một trong: ENEMY_SPOTTED, CAUTION, OBJECTIVE, HELP_ME, FLANKING"
    )
    val pingType: String
)
