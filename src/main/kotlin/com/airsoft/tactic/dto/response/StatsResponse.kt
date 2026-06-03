package com.airsoft.tactic.dto.response

import java.time.Instant
import java.util.UUID

data class StatsResponse(
    val userId: UUID,
    val displayName: String?,
    val totalMatches: Int,
    val wins: Int,
    val losses: Int,
    val draws: Int,
    val winRate: Double,
    val totalKills: Int,
    val totalDeaths: Int,
    val updatedAt: Instant?
)
