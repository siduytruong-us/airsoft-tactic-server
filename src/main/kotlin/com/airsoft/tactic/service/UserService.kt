package com.airsoft.tactic.service

import com.airsoft.tactic.dto.request.DeviceTokenRequest
import com.airsoft.tactic.dto.request.UpdateProfileRequest
import com.airsoft.tactic.dto.response.StatsResponse
import com.airsoft.tactic.dto.response.UserResponse
import com.airsoft.tactic.entity.DeviceToken
import com.airsoft.tactic.entity.PlayerStats
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.DeviceTokenRepository
import com.airsoft.tactic.repository.PlayerStatsRepository
import com.airsoft.tactic.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.math.round

@Service
class UserService(
    private val userRepository: UserRepository,
    private val statsRepository: PlayerStatsRepository,
    private val deviceTokenRepository: DeviceTokenRepository
) {
    @Transactional(readOnly = true)
    fun getMe(userId: UUID): UserResponse {
        val user  = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        val stats = statsRepository.findByUserId(userId)
        return toResponse(user, stats)
    }

    @Transactional
    fun updateMe(userId: UUID, req: UpdateProfileRequest): UserResponse {
        val user = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        req.displayName?.let { user.displayName = it }
        req.avatarUrl?.let { user.avatarUrl = it }
        return toResponse(userRepository.save(user), null)
    }

    @Transactional(readOnly = true)
    fun getStats(userId: UUID): StatsResponse {
        val user  = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        val stats = statsRepository.findByUserId(userId) ?: PlayerStats(userId = userId)
        return buildStats(userId, user.displayName, stats)
    }

    @Transactional
    fun upsertDeviceToken(userId: UUID, req: DeviceTokenRequest) {
        val user = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        val dt = deviceTokenRepository.findByUserIdAndPlatform(userId, req.platform)
            ?: DeviceToken(user = user, platform = req.platform, token = req.token)
        dt.token = req.token
        deviceTokenRepository.save(dt)
    }

    private fun toResponse(user: com.airsoft.tactic.entity.User, stats: PlayerStats?): UserResponse {
        return UserResponse(
            id = user.id!!, displayName = user.displayName, email = user.email,
            avatarUrl = user.avatarUrl, role = user.role,
            createdAt = user.createdAt, lastSeenAt = user.lastSeenAt,
            isNewUser = null,
            stats = stats?.let { buildStats(user.id!!, user.displayName, it) }
        )
    }

    private fun buildStats(userId: UUID, displayName: String, stats: PlayerStats): StatsResponse {
        val total = stats.totalMatches
        val wr = if (total > 0) round(stats.wins.toDouble() / total * 1000) / 1000.0 else 0.0
        return StatsResponse(
            userId = userId, displayName = displayName,
            totalMatches = total, wins = stats.wins, losses = stats.losses,
            draws = stats.draws, winRate = wr,
            totalKills = stats.totalKills, totalDeaths = stats.totalDeaths,
            updatedAt = stats.updatedAt
        )
    }
}
