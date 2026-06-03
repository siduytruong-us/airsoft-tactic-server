package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.Field
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface FieldRepository : JpaRepository<Field, UUID> {
    fun findByIsActiveTrue(pageable: Pageable): Page<Field>
}
