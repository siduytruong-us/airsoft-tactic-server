package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.request.AppleAuthRequest
import com.airsoft.tactic.dto.request.GoogleAuthRequest
import com.airsoft.tactic.dto.request.LogoutRequest
import com.airsoft.tactic.dto.request.RefreshTokenRequest
import com.airsoft.tactic.dto.response.AuthResponse
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/v1/auth")
class AuthController(private val authService: AuthService) {

    @PostMapping("/google")
    fun google(@Valid @RequestBody req: GoogleAuthRequest): ResponseEntity<ApiResponse<AuthResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(authService.googleSignIn(req.idToken)))
    }

    @PostMapping("/apple")
    fun apple(@Valid @RequestBody req: AppleAuthRequest): ResponseEntity<ApiResponse<AuthResponse>> {
        return ResponseEntity.ok(
            ApiResponse.ok(
                authService.appleSignIn(req.identityToken, req.displayName, req.email)
            )
        )
    }

    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody req: RefreshTokenRequest): ResponseEntity<ApiResponse<AuthResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(req.refreshToken)))
    }

    @PostMapping("/logout")
    fun logout(@Valid @RequestBody req: LogoutRequest, auth: Authentication): ResponseEntity<Void> {
        val userId = UUID.fromString(auth.name)
        authService.logout(userId, req.refreshToken)
        return ResponseEntity.noContent().build()
    }
}
