package com.airsoft.tactic.dto.response

import java.util.UUID

data class TeamSummaryResponse(
    val id: UUID,
    val name: String,
    val colorHex: String?,
    val playerCount: Int
)
