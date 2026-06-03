package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.Team
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface TeamRepository : JpaRepository<Team, UUID> {
    fun findByMatchId(matchId: UUID): List<Team>
    fun existsByIdAndMatchId(teamId: UUID, matchId: UUID): Boolean
}
