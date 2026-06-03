package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.request.DeviceTokenRequest
import com.airsoft.tactic.dto.request.UpdateProfileRequest
import com.airsoft.tactic.dto.response.MatchResponse
import com.airsoft.tactic.dto.response.PageResponse
import com.airsoft.tactic.dto.response.StatsResponse
import com.airsoft.tactic.dto.response.UserResponse
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.service.MatchService
import com.airsoft.tactic.service.UserService
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/v1/users")
class UserController(
    private val userService: UserService,
    private val matchService: MatchService
) {

    @GetMapping("/me")
    fun getMe(auth: Authentication): ResponseEntity<ApiResponse<UserResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMe(uid(auth))))
    }

    @PatchMapping("/me")
    fun updateMe(
        @Valid @RequestBody req: UpdateProfileRequest,
        auth: Authentication
    ): ResponseEntity<ApiResponse<UserResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateMe(uid(auth), req)))
    }

    @PutMapping("/me/device-token")
    fun deviceToken(
        @Valid @RequestBody req: DeviceTokenRequest,
        auth: Authentication
    ): ResponseEntity<Void> {
        userService.upsertDeviceToken(uid(auth), req)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/me/matches")
    fun myMatches(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        auth: Authentication
    ): ResponseEntity<ApiResponse<PageResponse<MatchResponse>>> {
        return ResponseEntity.ok(
            ApiResponse.ok(
                matchService.getMyMatches(uid(auth), PageRequest.of(page, size))
            )
        )
    }

    @GetMapping("/{userId}/stats")
    fun stats(@PathVariable userId: UUID): ResponseEntity<ApiResponse<StatsResponse>> {
        return ResponseEntity.ok(ApiResponse.ok(userService.getStats(userId)))
    }

    private fun uid(auth: Authentication): UUID {
        return UUID.fromString(auth.name)
    }
}
