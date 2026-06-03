package com.airsoft.tactic.admin.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

data class CreateGameModeRequest(
    @field:NotBlank val name: String,
    val description: String? = null,
    val rules: Array<String>? = null,
    @field:Min(2) val maxPlayers: Int = 20,
    @field:Min(2) val teamCount: Int = 2,
    val respawnEnabled: Boolean = true,
    @field:Min(0) val respawnDelaySeconds: Int = 30
)
