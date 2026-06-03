package com.airsoft.tactic.admin.service

import com.airsoft.tactic.admin.dto.CreateFieldRequest
import com.airsoft.tactic.admin.dto.CreateGameModeRequest
import com.airsoft.tactic.admin.dto.UpdateUserRoleRequest
import com.airsoft.tactic.dto.response.*
import com.airsoft.tactic.entity.Field
import com.airsoft.tactic.entity.GameMode
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.*
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AdminManagementService(
    private val fieldRepository: FieldRepository,
    private val gameModeRepository: GameModeRepository,
    private val userRepository: UserRepository,
    private val matchRepository: GameMatchRepository
) {

    // ── Fields ──────────────────────────────────────────────────────
    @Transactional
    fun createField(req: CreateFieldRequest): FieldResponse {
        val field = fieldRepository.save(Field(
            name = req.name, location = req.location,
            lat = req.lat, lng = req.lng,
            coverImageUrl = req.coverImageUrl,
            description = req.description
        ))
        return toFieldResponse(field)
    }

    @Transactional
    fun updateField(fieldId: UUID, req: CreateFieldRequest): FieldResponse {
        val field = fieldRepository.findById(fieldId)
            .orElseThrow { AppException.notFound("Field not found: $fieldId") }
        field.name = req.name
        field.location = req.location
        req.lat?.let { field.lat = it }
        req.lng?.let { field.lng = it }
        req.coverImageUrl?.let { field.coverImageUrl = it }
        req.description?.let { field.description = it }
        return toFieldResponse(fieldRepository.save(field))
    }

    @Transactional
    fun deleteField(fieldId: UUID) {
        val field = fieldRepository.findById(fieldId)
            .orElseThrow { AppException.notFound("Field not found: $fieldId") }
        field.isActive = false
        fieldRepository.save(field)
    }

    // ── Game Modes ───────────────────────────────────────────────────
    @Transactional
    fun createGameMode(fieldId: UUID, req: CreateGameModeRequest): GameModeResponse {
        val field = fieldRepository.findById(fieldId)
            .orElseThrow { AppException.notFound("Field not found: $fieldId") }
        val gm = gameModeRepository.save(GameMode(
            field = field, name = req.name, description = req.description,
            rules = req.rules, maxPlayers = req.maxPlayers, teamCount = req.teamCount,
            respawnEnabled = req.respawnEnabled, respawnDelaySeconds = req.respawnDelaySeconds
        ))
        return GameModeResponse(
            id = gm.id!!, name = gm.name, description = gm.description,
            rules = gm.rules, maxPlayers = gm.maxPlayers, teamCount = gm.teamCount,
            respawnEnabled = gm.respawnEnabled, respawnDelaySeconds = gm.respawnDelaySeconds
        )
    }

    @Transactional
    fun deleteGameMode(gameModeId: UUID) {
        val gm = gameModeRepository.findById(gameModeId)
            .orElseThrow { AppException.notFound("GameMode not found: $gameModeId") }
        gameModeRepository.delete(gm)
    }

    // ── Users ────────────────────────────────────────────────────────
    fun listUsers(pageable: Pageable): PageResponse<UserSummary> {
        val page = userRepository.findAll(pageable)
        return PageResponse.from(page.map { u ->
            UserSummary(id = u.id!!, displayName = u.displayName,
                email = u.email, role = u.role, createdAt = u.createdAt)
        })
    }

    @Transactional
    fun updateUserRole(userId: UUID, req: UpdateUserRoleRequest): UserSummary {
        val validRoles = setOf("player", "organizer", "admin")
        if (req.role !in validRoles)
            throw AppException.unprocessable("VALIDATION_ERROR", "Invalid role: ${req.role}")
        val user = userRepository.findById(userId)
            .orElseThrow { AppException.notFound("User not found: $userId") }
        user.role = req.role
        val saved = userRepository.save(user)
        return UserSummary(id = saved.id!!, displayName = saved.displayName,
            email = saved.email, role = saved.role, createdAt = saved.createdAt)
    }

    // ── Stats ────────────────────────────────────────────────────────
    fun getSystemStats(): Map<String, Any> = mapOf(
        "totalUsers"   to userRepository.count(),
        "totalFields"  to fieldRepository.count(),
        "activeFields" to fieldRepository.findByIsActiveTrue(Pageable.unpaged()).totalElements,
        "totalMatches" to matchRepository.count()
    )

    private fun toFieldResponse(f: Field) = FieldResponse(
        id = f.id!!, name = f.name, location = f.location,
        lat = f.lat, lng = f.lng, coverImageUrl = f.coverImageUrl,
        description = f.description, isLive = false,
        activeMatchId = null, gameModes = null, currentGame = null
    )
}

data class UserSummary(
    val id: UUID,
    val displayName: String,
    val email: String?,
    val role: String,
    val createdAt: java.time.Instant?
)
