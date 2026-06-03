package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.Instant
import java.util.UUID

data class CreateEventRequest(
    @field:NotBlank val title: String,
    val description: String?,
    @field:NotNull val fieldId: UUID,
    @field:NotNull val startTime: Instant,
    @field:NotNull val endTime: Instant,
    @field:Min(1) val maxCapacity: Int?
)
