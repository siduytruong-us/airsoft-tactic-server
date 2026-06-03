package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class FieldResponse(
    val id: UUID,
    val name: String,
    val location: String?,
    val lat: Double?,
    val lng: Double?,
    val coverImageUrl: String?,
    val description: String?,
    val isLive: Boolean,
    val activeMatchId: UUID?,
    val gameModes: List<GameModeResponse>?,
    val currentGame: MatchSummaryResponse?
)
