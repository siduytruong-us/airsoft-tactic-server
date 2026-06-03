package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class TeamDetailResponse(
    val id: UUID,
    val name: String,
    val colorHex: String?,
    val objectives: Array<String>?,
    val respawnBase: String?,
    val players: List<PlayerInTeamResponse>?,
    val isWinner: Boolean?
)
