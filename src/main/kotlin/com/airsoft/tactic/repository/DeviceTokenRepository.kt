package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.DeviceToken
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface DeviceTokenRepository : JpaRepository<DeviceToken, UUID> {
    fun findByUserIdAndPlatform(userId: UUID, platform: String): DeviceToken?
    fun findByUserId(userId: UUID): List<DeviceToken>
}
