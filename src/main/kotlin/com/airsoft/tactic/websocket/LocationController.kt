package com.airsoft.tactic.websocket

import com.airsoft.tactic.dto.request.LocationRequest
import com.airsoft.tactic.service.MatchService
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.stereotype.Controller
import java.util.UUID

@Controller
class LocationController(private val matchService: MatchService) {

    private val logger = LoggerFactory.getLogger(LocationController::class.java)

    @MessageMapping("/match/{matchId}/location")
    fun handleLocation(
        @DestinationVariable matchId: UUID,
        payload: LocationRequest,
        headerAccessor: SimpMessageHeaderAccessor
    ) {
        val userId = headerAccessor.user?.name?.let {
            runCatching { UUID.fromString(it) }.getOrNull()
        } ?: run {
            logger.warn("LocationController: unauthenticated STOMP frame for match $matchId — ignored")
            return
        }

        matchService.updateLocation(matchId, userId, payload.latitude, payload.longitude)
    }
}
