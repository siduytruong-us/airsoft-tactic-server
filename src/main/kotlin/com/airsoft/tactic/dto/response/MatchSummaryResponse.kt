package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class MatchSummaryResponse(
    val id: UUID,
    val status: String,
    val gameModeName: String,
    val playerCount: Int,
    val maxPlayers: Int,
    val teams: List<TeamSummaryResponse>?
)
