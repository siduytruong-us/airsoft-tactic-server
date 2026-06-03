package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotNull
import java.util.UUID

data class CreateMatchRequest(
    @field:NotNull val fieldId: UUID,
    @field:NotNull val gameModeId: UUID
)
