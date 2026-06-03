package com.airsoft.tactic.dto.response

import java.util.UUID

data class GameModeResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val rules: Array<String>?,
    val maxPlayers: Int,
    val teamCount: Int,
    val respawnEnabled: Boolean,
    val respawnDelaySeconds: Int
)
