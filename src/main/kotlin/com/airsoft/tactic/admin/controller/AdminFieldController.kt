package com.airsoft.tactic.admin.controller

import com.airsoft.tactic.admin.dto.CreateFieldRequest
import com.airsoft.tactic.admin.dto.CreateGameModeRequest
import com.airsoft.tactic.admin.service.AdminManagementService
import com.airsoft.tactic.dto.response.FieldResponse
import com.airsoft.tactic.dto.response.GameModeResponse
import com.airsoft.tactic.exception.ApiResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/v1/admin/fields")
@PreAuthorize("hasRole('ADMIN')")
class AdminFieldController(private val adminService: AdminManagementService) {

    @PostMapping
    fun createField(@Valid @RequestBody req: CreateFieldRequest): ResponseEntity<ApiResponse<FieldResponse>> =
        ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(adminService.createField(req)))

    @PutMapping("/{fieldId}")
    fun updateField(@PathVariable fieldId: UUID, @Valid @RequestBody req: CreateFieldRequest): ResponseEntity<ApiResponse<FieldResponse>> =
        ResponseEntity.ok(ApiResponse.ok(adminService.updateField(fieldId, req)))

    @DeleteMapping("/{fieldId}")
    fun deleteField(@PathVariable fieldId: UUID): ResponseEntity<Void> {
        adminService.deleteField(fieldId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{fieldId}/game-modes")
    fun createGameMode(@PathVariable fieldId: UUID, @Valid @RequestBody req: CreateGameModeRequest): ResponseEntity<ApiResponse<GameModeResponse>> =
        ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(adminService.createGameMode(fieldId, req)))

    @DeleteMapping("/game-modes/{gameModeId}")
    fun deleteGameMode(@PathVariable gameModeId: UUID): ResponseEntity<Void> {
        adminService.deleteGameMode(gameModeId)
        return ResponseEntity.noContent().build()
    }
}
