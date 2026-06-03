package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.GameMatch
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface GameMatchRepository : JpaRepository<GameMatch, UUID> {
    @Query("SELECT m FROM GameMatch m WHERE m.field.id = :fieldId AND m.status IN ('WAITING','IN_PROGRESS') ORDER BY m.createdAt DESC")
    fun findActiveByFieldId(fieldId: UUID): GameMatch?

    @Query("SELECT m FROM GameMatch m JOIN MatchPlayer mp ON mp.match.id = m.id WHERE mp.user.id = :userId AND m.status IN ('WAITING','IN_PROGRESS') ORDER BY m.createdAt DESC")
    fun findActiveMatchForUser(userId: UUID): GameMatch?
}
