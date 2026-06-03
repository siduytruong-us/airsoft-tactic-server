package com.airsoft.tactic.dto.response

import java.time.Instant
import java.util.UUID

data class PingResponse(
    val id: UUID,
    val matchId: UUID,
    val userId: UUID,
    val displayName: String,
    val latitude: Double,
    val longitude: Double,
    val pingType: String,
    val createdAt: Instant,
    val expiresAt: Instant
)
