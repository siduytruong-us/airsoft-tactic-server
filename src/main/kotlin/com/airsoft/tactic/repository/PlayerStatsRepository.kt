package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.PlayerStats
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PlayerStatsRepository : JpaRepository<PlayerStats, UUID> {
    fun findByUserId(userId: UUID): PlayerStats?
}
