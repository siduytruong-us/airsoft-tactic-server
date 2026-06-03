package com.airsoft.tactic.websocket

import com.airsoft.tactic.entity.User
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.UUID

@Component
class MatchEventPublisher(private val messaging: SimpMessagingTemplate) {

    fun playerJoined(matchId: UUID, teamId: UUID, user: User, joinedAt: Instant?) {
        messaging.convertAndSend(
            "/topic/match/$matchId/lobby", mapOf(
                "event" to "PLAYER_JOINED",
                "matchId" to matchId,
                "teamId" to teamId,
                "player" to mapOf(
                    "userId" to user.id,
                    "displayName" to user.displayName,
                    "avatarUrl" to (user.avatarUrl ?: ""),
                    "joinedAt" to (joinedAt?.toString() ?: "")
                )
            )
        )
    }

    fun playerLeft(matchId: UUID, teamId: UUID, userId: UUID) {
        messaging.convertAndSend(
            "/topic/match/$matchId/lobby", mapOf(
                "event" to "PLAYER_LEFT",
                "matchId" to matchId,
                "teamId" to teamId,
                "userId" to userId
            )
        )
    }

    fun matchStarted(matchId: UUID, startedAt: Instant?) {
        messaging.convertAndSend(
            "/topic/match/$matchId/lobby", mapOf(
                "event" to "MATCH_STARTED",
                "matchId" to matchId,
                "startedAt" to (startedAt?.toString() ?: "")
            )
        )
    }

    fun matchEnded(matchId: UUID, endedAt: Instant?, winningTeamId: UUID?) {
        val payload = mutableMapOf<String, Any>(
            "event" to "MATCH_ENDED",
            "matchId" to matchId,
            "endedAt" to (endedAt?.toString() ?: "")
        )
        if (winningTeamId != null) payload["winningTeamId"] = winningTeamId
        messaging.convertAndSend("/topic/match/$matchId/lobby", payload)
    }

    fun hitReported(matchId: UUID, userId: UUID, respawnAt: Instant?) {
        messaging.convertAndSend(
            "/topic/match/$matchId/game", mapOf(
                "event" to "HIT_REPORTED",
                "matchId" to matchId,
                "userId" to userId,
                "respawnAt" to (respawnAt?.toString() ?: "")
            )
        )
    }

    fun pingSent(
        matchId: UUID,
        pingId: UUID,
        userId: UUID,
        displayName: String,
        latitude: Double,
        longitude: Double,
        pingType: String,
        createdAt: Instant,
        expiresAt: Instant
    ) {
        messaging.convertAndSend(
            "/topic/match/$matchId/game", mapOf(
                "event" to "PING_SENT",
                "matchId" to matchId,
                "pingId" to pingId,
                "userId" to userId,
                "displayName" to displayName,
                "latitude" to latitude,
                "longitude" to longitude,
                "pingType" to pingType,
                "createdAt" to createdAt.toString(),
                "expiresAt" to expiresAt.toString()
            )
        )
    }
}
