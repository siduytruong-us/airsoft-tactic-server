package com.airsoft.tactic.admin.controller

import com.airsoft.tactic.admin.dto.AdminInfo
import com.airsoft.tactic.admin.dto.AdminLoginRequest
import com.airsoft.tactic.admin.dto.AdminLoginResponse
import com.airsoft.tactic.admin.dto.CreateAdminRequest
import com.airsoft.tactic.admin.service.AdminAuthService
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.AdminAccountRepository
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/v1/admin/auth")
class AdminAuthController(
    private val adminAuthService: AdminAuthService,
    private val adminAccountRepository: AdminAccountRepository,
    private val passwordEncoder: BCryptPasswordEncoder
) {
    /** Public — login */
    @PostMapping("/login")
    fun login(@Valid @RequestBody req: AdminLoginRequest): ResponseEntity<ApiResponse<AdminLoginResponse>> =
        ResponseEntity.ok(ApiResponse.ok(adminAuthService.login(req)))

    /**
     * Bootstrap — public, không cần auth, không cần body.
     * Upsert admin mặc định: tạo mới hoặc reset password về Admin123@.
     * Gọi bất cứ lúc nào để đảm bảo login hoạt động.
     */
    @PostMapping("/bootstrap")
    fun bootstrap(): ResponseEntity<ApiResponse<AdminInfo>> {
        val defaultPassword = "Admin123@"
        val existing = adminAccountRepository.findByUsername("admin")
        if (existing != null) {
            // Luôn reset password về default — tránh trường hợp hash trong DB sai
            existing.passwordHash = passwordEncoder.encode(defaultPassword)
            adminAccountRepository.save(existing)
            return ResponseEntity.ok(ApiResponse.ok(
                AdminInfo(id = existing.id!!.toString(), username = existing.username, displayName = existing.displayName)
            ))
        }
        val info = adminAuthService.createAdmin(
            CreateAdminRequest(username = "admin", password = defaultPassword, displayName = "System Admin")
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(info))
    }

    /** Admin only — tạo admin mới */
    @PostMapping("/create")
    @PreAuthorize("hasRole('ADMIN')")
    fun createAdmin(@Valid @RequestBody req: CreateAdminRequest): ResponseEntity<ApiResponse<AdminInfo>> =
        ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(adminAuthService.createAdmin(req)))
}
