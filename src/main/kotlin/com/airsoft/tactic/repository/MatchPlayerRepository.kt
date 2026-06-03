package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.MatchPlayer
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface MatchPlayerRepository : JpaRepository<MatchPlayer, UUID> {
    fun findByMatchIdAndUserId(matchId: UUID, userId: UUID): MatchPlayer?
    fun existsByMatchIdAndUserId(matchId: UUID, userId: UUID): Boolean
    fun findByMatchId(matchId: UUID): List<MatchPlayer>
    fun findByTeamId(teamId: UUID): List<MatchPlayer>

    @Query("SELECT COUNT(mp) FROM MatchPlayer mp WHERE mp.match.id = :matchId")
    fun countByMatchId(matchId: UUID): Int

    @Query("""
        SELECT mp FROM MatchPlayer mp
        JOIN FETCH mp.match m
        JOIN FETCH m.field
        JOIN FETCH m.gameMode
        WHERE mp.user.id = :userId AND m.status = 'ENDED'
        ORDER BY m.endedAt DESC
    """)
    fun findEndedMatchesForUser(userId: UUID, pageable: Pageable): List<MatchPlayer>
}
