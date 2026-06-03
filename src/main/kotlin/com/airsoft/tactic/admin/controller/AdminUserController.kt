package com.airsoft.tactic.admin.controller

import com.airsoft.tactic.admin.dto.UpdateUserRoleRequest
import com.airsoft.tactic.admin.service.AdminManagementService
import com.airsoft.tactic.admin.service.UserSummary
import com.airsoft.tactic.dto.response.PageResponse
import com.airsoft.tactic.exception.ApiResponse
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
class AdminUserController(private val adminService: AdminManagementService) {

    @GetMapping("/users")
    fun listUsers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<ApiResponse<PageResponse<UserSummary>>> =
        ResponseEntity.ok(ApiResponse.ok(adminService.listUsers(PageRequest.of(page, size, Sort.by("createdAt").descending()))))

    @PatchMapping("/users/{userId}/role")
    fun updateRole(@PathVariable userId: UUID, @Valid @RequestBody req: UpdateUserRoleRequest): ResponseEntity<ApiResponse<UserSummary>> =
        ResponseEntity.ok(ApiResponse.ok(adminService.updateUserRole(userId, req)))

    @GetMapping("/stats")
    fun systemStats(): ResponseEntity<ApiResponse<Map<String, Any>>> =
        ResponseEntity.ok(ApiResponse.ok(adminService.getSystemStats()))
}
