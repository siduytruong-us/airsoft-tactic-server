package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class EventResponse(
    val id: UUID,
    val title: String,
    val description: String?,
    val fieldId: UUID,
    val fieldName: String,
    val organizerId: UUID,
    val organizerName: String,
    val startTime: Instant,
    val endTime: Instant,
    val maxCapacity: Int?,
    val rsvpCount: Int,
    val status: String,
    val isRsvped: Boolean
)
