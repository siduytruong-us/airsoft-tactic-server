package com.airsoft.tactic.admin.service

import com.airsoft.tactic.admin.dto.AdminInfo
import com.airsoft.tactic.admin.dto.AdminLoginRequest
import com.airsoft.tactic.admin.dto.AdminLoginResponse
import com.airsoft.tactic.admin.dto.CreateAdminRequest
import com.airsoft.tactic.entity.AdminAccount
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.AdminAccountRepository
import com.airsoft.tactic.util.JwtUtil
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class AdminAuthService(
    private val adminAccountRepository: AdminAccountRepository,
    private val jwtUtil: JwtUtil,
    private val passwordEncoder: BCryptPasswordEncoder
) {
    fun login(req: AdminLoginRequest): AdminLoginResponse {
        val account = adminAccountRepository.findByUsername(req.username)
            ?: throw AppException.unauthorized("TOKEN_INVALID", "Invalid username or password")

        if (!account.isActive)
            throw AppException.unauthorized("TOKEN_INVALID", "Account is disabled")

        if (!passwordEncoder.matches(req.password, account.passwordHash))
            throw AppException.unauthorized("TOKEN_INVALID", "Invalid username or password")

        account.lastLoginAt = Instant.now()
        adminAccountRepository.save(account)

        val token = jwtUtil.generateAccessToken(account.id!!, account.username, "admin")
        return AdminLoginResponse(
            accessToken = token,
            expiresIn = jwtUtil.accessTokenValiditySeconds,
            admin = AdminInfo(
                id = account.id!!.toString(),
                username = account.username,
                displayName = account.displayName
            )
        )
    }

    fun createAdmin(req: CreateAdminRequest): AdminInfo {
        if (adminAccountRepository.findByUsername(req.username) != null)
            throw AppException.conflict("ALREADY_EXISTS", "Username '${req.username}' already taken")

        val account = adminAccountRepository.save(
            AdminAccount(
                username = req.username,
                passwordHash = passwordEncoder.encode(req.password),
                displayName = req.displayName.ifBlank { "Admin" }
            )
        )
        return AdminInfo(
            id = account.id!!.toString(),
            username = account.username,
            displayName = account.displayName
        )
    }
}
