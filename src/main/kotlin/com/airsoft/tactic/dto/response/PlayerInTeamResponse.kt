package com.airsoft.tactic.dto.response

import java.time.Instant
import java.util.UUID

data class PlayerInTeamResponse(
    val userId: UUID,
    val displayName: String?,
    val avatarUrl: String?,
    val joinedAt: Instant?,
    val killCount: Int?,
    val deathCount: Int?
)
