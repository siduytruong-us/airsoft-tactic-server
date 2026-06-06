package com.airsoft.tactic.service

import com.airsoft.tactic.dto.response.AuthResponse
import com.airsoft.tactic.dto.response.UserResponse
import com.airsoft.tactic.entity.PlayerStats
import com.airsoft.tactic.entity.RefreshToken
import com.airsoft.tactic.entity.User
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.PlayerStatsRepository
import com.airsoft.tactic.repository.RefreshTokenRepository
import com.airsoft.tactic.repository.UserRepository
import com.airsoft.tactic.util.JwtUtil
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.reactive.function.client.WebClient
import java.time.Instant
import java.util.Base64
import java.util.UUID

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val playerStatsRepository: PlayerStatsRepository,
    private val jwtUtil: JwtUtil,
    webClientBuilder: WebClient.Builder,
    private val objectMapper: ObjectMapper
) {
    // Reuse single WebClient — tránh overhead build() mỗi lần gọi
    private val googleWebClient: WebClient = webClientBuilder.build()

    @Transactional
    fun googleSignIn(idToken: String): AuthResponse {
        val payload = verifyGoogleToken(idToken)
        val googleId = payload.get("sub").asText()
        val email    = payload.get("email")?.asText()
        val name     = payload.get("name")?.asText()
        val picture  = payload.get("picture")?.asText()

        var isNew = false
        val user = userRepository.findByGoogleId(googleId) ?: run {
            isNew = true
            val displayName = name?.takeIf { it.isNotBlank() }
                ?: email?.substringBefore("@") ?: "Player"
            userRepository.save(User(googleId = googleId, email = email,
                displayName = displayName, avatarUrl = picture))
        }

        if (isNew) createPlayerStats(user.id!!)
        user.lastSeenAt = Instant.now()
        userRepository.save(user)
        return buildAuthResponse(user, isNew)
    }

    @Transactional
    fun appleSignIn(identityToken: String, displayName: String?, email: String?): AuthResponse {
        val appleId = verifyAppleToken(identityToken)

        var isNew = false
        val user = userRepository.findByAppleId(appleId) ?: run {
            isNew = true
            val name = displayName?.takeIf { it.isNotBlank() }
                ?: email?.substringBefore("@") ?: "Player"
            userRepository.save(User(appleId = appleId, email = email, displayName = name))
        }

        if (isNew) createPlayerStats(user.id!!)
        user.lastSeenAt = Instant.now()
        userRepository.save(user)
        return buildAuthResponse(user, isNew)
    }

    @Transactional
    fun refresh(rawRefreshToken: String): AuthResponse {
        val rt = refreshTokenRepository.findByToken(rawRefreshToken)
            ?: throw AppException.unauthorized("TOKEN_INVALID", "Refresh token not found")

        if (rt.expiresAt.isBefore(Instant.now())) {
            refreshTokenRepository.delete(rt)
            throw AppException.unauthorized("TOKEN_EXPIRED", "Refresh token expired")
        }

        refreshTokenRepository.delete(rt)
        return buildAuthResponse(rt.user, false)
    }

    @Transactional
    fun logout(userId: UUID, rawRefreshToken: String) {
        refreshTokenRepository.findByToken(rawRefreshToken)
            ?.let { refreshTokenRepository.delete(it) }
    }

    private fun buildAuthResponse(user: User, isNew: Boolean): AuthResponse {
        val accessToken  = jwtUtil.generateAccessToken(user.id!!, user.email, user.role)
        val refreshToken = generateAndSaveRefreshToken(user)
        return AuthResponse(
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresIn = jwtUtil.accessTokenValiditySeconds,
            user = UserResponse(
                id = user.id!!, displayName = user.displayName,
                email = user.email, avatarUrl = user.avatarUrl,
                role = user.role, isNewUser = isNew,
                createdAt = null, lastSeenAt = null, stats = null
            )
        )
    }

    private fun generateAndSaveRefreshToken(user: User): String {
        val token = "${UUID.randomUUID()}-${UUID.randomUUID()}"
        refreshTokenRepository.save(RefreshToken(
            user = user, token = token,
            expiresAt = Instant.now().plusSeconds(30L * 24 * 3600)
        ))
        return token
    }

    private fun createPlayerStats(userId: UUID) {
        if (!playerStatsRepository.existsById(userId))
            playerStatsRepository.save(PlayerStats(userId = userId))
    }

    private fun verifyGoogleToken(idToken: String): JsonNode =
        try {
            googleWebClient.get()
                .uri("https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=$idToken")
                .retrieve().bodyToMono(JsonNode::class.java).block()
                ?: throw AppException.unauthorized("TOKEN_INVALID", "Invalid Google ID token")
        } catch (e: Exception) {
            throw AppException.unauthorized("TOKEN_INVALID", "Invalid Google ID token")
        }

    private fun verifyAppleToken(identityToken: String): String =
        try {
            val payload = String(Base64.getUrlDecoder().decode(identityToken.split(".")[1]))
            objectMapper.readTree(payload).get("sub").asText()
        } catch (e: Exception) {
            throw AppException.unauthorized("TOKEN_INVALID", "Invalid Apple identity token")
        }
}
