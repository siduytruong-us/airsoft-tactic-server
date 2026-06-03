package com.airsoft.tactic.admin.controller

import com.airsoft.tactic.admin.dto.AdminInfo
import com.airsoft.tactic.admin.dto.AdminLoginRequest
import com.airsoft.tactic.admin.dto.AdminLoginResponse
import com.airsoft.tactic.admin.dto.CreateAdminRequest
import com.airsoft.tactic.admin.service.AdminAuthService
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.AdminAccountRepository
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
    private val adminAccountRepository: AdminAccountRepository
) {
    /** Public — login */
    @PostMapping("/login")
    fun login(@Valid @RequestBody req: AdminLoginRequest): ResponseEntity<ApiResponse<AdminLoginResponse>> =
        ResponseEntity.ok(ApiResponse.ok(adminAuthService.login(req)))

    /**
     * Bootstrap — chỉ hoạt động khi CHƯA có admin nào trong hệ thống.
     * Sau khi tạo admin đầu tiên, endpoint này tự động bị khóa.
     */
    @PostMapping("/bootstrap")
    fun bootstrap(@Valid @RequestBody req: CreateAdminRequest): ResponseEntity<ApiResponse<AdminInfo>> {
        if (adminAccountRepository.count() > 0)
            throw AppException.forbidden("System already has admin accounts. Use /create instead.")
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(adminAuthService.createAdmin(req)))
    }

    /** Admin only — tạo admin mới */
    @PostMapping("/create")
    @PreAuthorize("hasRole('ADMIN')")
    fun createAdmin(@Valid @RequestBody req: CreateAdminRequest): ResponseEntity<ApiResponse<AdminInfo>> =
        ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(adminAuthService.createAdmin(req)))
}
