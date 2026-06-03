package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.response.GameModeResponse
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.GameModeRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/game-modes")
class GameModeController(private val gameModeRepository: GameModeRepository) {

    @GetMapping
    fun getAllGameModes(): ResponseEntity<List<GameModeResponse>> {
        val modes = gameModeRepository.findAll().mapNotNull { gm ->
            gm.id?.let {
                GameModeResponse(
                    id = it,
                    name = gm.name,
                    description = gm.description,
                    rules = gm.rules,
                    maxPlayers = gm.maxPlayers,
                    teamCount = gm.teamCount,
                    respawnEnabled = gm.respawnEnabled,
                    respawnDelaySeconds = gm.respawnDelaySeconds
                )
            }
        }
        return ResponseEntity.ok(modes)
    }

    @GetMapping("/{id}")
    fun getGameModeById(@PathVariable id: UUID): ResponseEntity<GameModeResponse> {
        val gm = gameModeRepository.findById(id).orElseThrow {
            AppException.notFound("GameMode not found: $id")
        }
        return ResponseEntity.ok(
            GameModeResponse(
                id = gm.id!!,
                name = gm.name,
                description = gm.description,
                rules = gm.rules,
                maxPlayers = gm.maxPlayers,
                teamCount = gm.teamCount,
                respawnEnabled = gm.respawnEnabled,
                respawnDelaySeconds = gm.respawnDelaySeconds
            )
        )
    }
}
