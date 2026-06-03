package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.Rsvp
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

interface RsvpRepository : JpaRepository<Rsvp, UUID> {
    fun findByEventIdAndUserId(eventId: UUID, userId: UUID): Rsvp?
    fun existsByEventIdAndUserId(eventId: UUID, userId: UUID): Boolean

    @Query("SELECT COUNT(r) FROM Rsvp r WHERE r.event.id = :eventId")
    fun countByEventId(eventId: UUID): Int
}
