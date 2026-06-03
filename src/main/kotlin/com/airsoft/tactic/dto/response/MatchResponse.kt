package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class MatchResponse(
    val id: UUID,
    val fieldId: UUID,
    val fieldName: String,
    val gameModeId: UUID,
    val gameModeName: String,
    val status: String,
    val maxPlayers: Int,
    val playerCount: Int,
    val startedAt: Instant?,
    val endedAt: Instant?,
    val winningTeamId: UUID?,
    val winningTeamName: String?,
    val durationSeconds: Long?,
    val myTeamId: UUID?,
    val canJoin: Boolean,
    val teams: List<TeamDetailResponse>?,
    val result: String?
)
