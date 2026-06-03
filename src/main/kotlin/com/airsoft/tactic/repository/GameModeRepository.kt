package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.GameMode
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface GameModeRepository : JpaRepository<GameMode, UUID> {
    fun findByFieldId(fieldId: UUID): List<GameMode>
}
