package com.airsoft.tactic.service

import com.airsoft.tactic.dto.response.*
import com.airsoft.tactic.entity.Field
import com.airsoft.tactic.entity.GameMode
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.*
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class FieldService(
    private val fieldRepository: FieldRepository,
    private val gameModeRepository: GameModeRepository,
    private val matchRepository: GameMatchRepository,
    private val matchPlayerRepository: MatchPlayerRepository,
    private val teamRepository: TeamRepository
) {
    fun listFields(pageable: Pageable): PageResponse<FieldResponse> =
        PageResponse.from(fieldRepository.findByIsActiveTrue(pageable).map { toSummary(it) })

    fun getField(fieldId: UUID, requestingUserId: UUID?): FieldResponse {
        val field = fieldRepository.findById(fieldId).orElseThrow {
            AppException.notFound("Field not found: $fieldId")
        }
        return toDetail(field)
    }

    private fun toSummary(field: Field): FieldResponse {
        val active = matchRepository.findActiveByFieldId(field.id!!)
        val modes  = gameModeRepository.findByFieldId(field.id!!)
        return FieldResponse(
            id = field.id!!, name = field.name, location = field.location,
            lat = null, lng = null, coverImageUrl = field.coverImageUrl,
            description = null,
            isLive = active?.status == "IN_PROGRESS",
            activeMatchId = active?.id,
            gameModes = modes.map(::toGameModeResponse),
            currentGame = null
        )
    }

    private fun toDetail(field: Field): FieldResponse {
        val active = matchRepository.findActiveByFieldId(field.id!!)
        val modes  = gameModeRepository.findByFieldId(field.id!!)
        val currentGame = active?.let { m ->
            val teams = teamRepository.findByMatchId(m.id!!)
            MatchSummaryResponse(
                id = m.id!!, status = m.status,
                gameModeName = m.gameMode.name, maxPlayers = m.maxPlayers,
                playerCount = matchPlayerRepository.countByMatchId(m.id!!),
                teams = teams.map { t ->
                    TeamSummaryResponse(id = t.id!!, name = t.name, colorHex = t.colorHex,
                        playerCount = matchPlayerRepository.findByTeamId(t.id!!).size)
                }
            )
        }
        return FieldResponse(
            id = field.id!!, name = field.name, location = field.location,
            lat = field.lat, lng = field.lng, coverImageUrl = field.coverImageUrl,
            description = field.description,
            isLive = active?.status == "IN_PROGRESS",
            activeMatchId = active?.id,
            gameModes = modes.map(::toGameModeResponse),
            currentGame = currentGame
        )
    }

    private fun toGameModeResponse(gm: GameMode) = GameModeResponse(
        id = gm.id!!, name = gm.name, description = gm.description,
        rules = gm.rules, maxPlayers = gm.maxPlayers, teamCount = gm.teamCount,
        respawnEnabled = gm.respawnEnabled, respawnDelaySeconds = gm.respawnDelaySeconds
    )
}
