package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.HitEvent
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.UUID

interface HitEventRepository : JpaRepository<HitEvent, UUID> {
    @Query("SELECT h FROM HitEvent h WHERE h.match.id = :matchId AND h.user.id = :userId AND h.reportedAt > :since ORDER BY h.reportedAt DESC")
    fun findRecentHit(matchId: UUID, userId: UUID, since: Instant): HitEvent?
}
