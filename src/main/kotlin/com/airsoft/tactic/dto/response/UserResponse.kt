package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.util.UUID

@JsonInclude(JsonInclude.Include.NON_NULL)
data class UserResponse(
    val id: UUID,
    val displayName: String?,
    val email: String?,
    val avatarUrl: String?,
    val role: String?,
    val createdAt: Instant?,
    val lastSeenAt: Instant?,
    val isNewUser: Boolean?,
    val stats: StatsResponse?
)
