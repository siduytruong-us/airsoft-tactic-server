package com.airsoft.tactic.util

import io.jsonwebtoken.Claims
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Component
class JwtUtil(@Value("\${supabase.jwt-secret}") secret: String) {

    private val secretKey: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))
    val accessTokenValiditySeconds: Long = 3600L

    fun generateAccessToken(userId: UUID, email: String?, role: String): String {
        val now = Instant.now()
        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(accessTokenValiditySeconds)))
            .signWith(secretKey)
            .compact()
    }

    fun validateAndExtract(token: String): Claims? {
        return try {
            Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .payload
        } catch (e: JwtException) {
            log.warn("Invalid JWT: {}", e.message)
            null
        } catch (e: IllegalArgumentException) {
            log.warn("Invalid JWT: {}", e.message)
            null
        }
    }

    companion object {
        private val log = LoggerFactory.getLogger(JwtUtil::class.java)
    }
}
