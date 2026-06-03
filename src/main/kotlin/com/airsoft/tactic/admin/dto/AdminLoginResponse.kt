package com.airsoft.tactic.admin.dto

data class AdminLoginResponse(
    val accessToken: String,
    val expiresIn: Long = 3600,
    val tokenType: String = "Bearer",
    val admin: AdminInfo
)

data class AdminInfo(
    val id: String,
    val username: String,
    val displayName: String
)
