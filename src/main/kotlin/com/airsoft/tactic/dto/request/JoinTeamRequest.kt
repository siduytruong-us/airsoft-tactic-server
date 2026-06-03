package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotNull
import java.util.UUID

data class JoinTeamRequest(@field:NotNull val teamId: UUID)
