package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.request.*
import com.airsoft.tactic.dto.response.MatchResponse
import com.airsoft.tactic.dto.response.PingResponse
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.service.MatchService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/v1/matches")
class MatchController(private val matchService: MatchService) {

    @PostMapping
    fun create(@Valid @RequestBody req: CreateMatchRequest, auth: Authentication): ResponseEntity<ApiResponse<MatchResponse>> {
        requireAdmin(auth)
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(matchService.createMatch(uid(auth), req)))
    }

    @GetMapping("/active")
    fun active(auth: Authentication): ResponseEntity<*> {
        val match = matchService.getActiveMatch(uid(auth))
        return if (match != null) ResponseEntity.ok(ApiResponse.ok(match))
        else ResponseEntity.noContent().build<Any>()
    }

    @GetMapping("/{matchId}")
    fun get(@PathVariable matchId: UUID, auth: Authentication): ResponseEntity<ApiResponse<MatchResponse>> =
        ResponseEntity.ok(ApiResponse.ok(matchService.getMatch(matchId, uid(auth))))

    @GetMapping("/{matchId}/detail")
    fun detail(@PathVariable matchId: UUID, auth: Authentication): ResponseEntity<ApiResponse<MatchResponse>> =
        ResponseEntity.ok(ApiResponse.ok(matchService.getMatch(matchId, uid(auth))))

    @PostMapping("/{matchId}/join")
    fun join(@PathVariable matchId: UUID, @Valid @RequestBody req: JoinTeamRequest, auth: Authentication): ResponseEntity<ApiResponse<Map<String, Any>>> =
        ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(matchService.joinTeam(matchId, req.teamId, uid(auth))))

    @DeleteMapping("/{matchId}/leave")
    fun leave(@PathVariable matchId: UUID, auth: Authentication): ResponseEntity<Void> {
        matchService.leaveMatch(matchId, uid(auth))
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{matchId}/start")
    fun start(@PathVariable matchId: UUID, auth: Authentication): ResponseEntity<ApiResponse<MatchResponse>> {
        requireAdmin(auth)
        return ResponseEntity.ok(ApiResponse.ok(matchService.startMatch(matchId, uid(auth))))
    }

    @PostMapping("/{matchId}/hit")
    fun hit(@PathVariable matchId: UUID, auth: Authentication): ResponseEntity<ApiResponse<Map<String, Any>>> =
        ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(matchService.reportHit(matchId, uid(auth))))

    @PostMapping("/{matchId}/ping")
    fun ping(@PathVariable matchId: UUID, @Valid @RequestBody req: PingRequest, auth: Authentication): ResponseEntity<ApiResponse<PingResponse>> =
        ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(matchService.sendPing(matchId, uid(auth), req)))

    @PostMapping("/{matchId}/end")
    fun end(@PathVariable matchId: UUID, @RequestBody(required = false) req: EndMatchRequest?, auth: Authentication): ResponseEntity<ApiResponse<MatchResponse>> {
        requireAdmin(auth)
        return ResponseEntity.ok(ApiResponse.ok(matchService.endMatch(matchId, uid(auth), req ?: EndMatchRequest(null))))
    }

    private fun uid(auth: Authentication) = UUID.fromString(auth.name)
    private fun requireAdmin(auth: Authentication) {
        val role = auth.authorities.firstOrNull()?.authority ?: ""
        if (!role.contains("ADMIN"))
            throw AppException.forbidden("Only admins can perform this action")
    }
}