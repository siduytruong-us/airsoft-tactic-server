package com.airsoft.tactic.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "player_stats")
class PlayerStats(
    @Id
    @Column(name = "user_id")
    var userId: UUID,

    var totalMatches: Int = 0,
    var wins: Int = 0,
    var losses: Int = 0,
    var draws: Int = 0,
    var totalKills: Int = 0,
    var totalDeaths: Int = 0,

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now()
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PlayerStats

        return userId == other.userId
    }

    override fun hashCode(): Int {
        return userId.hashCode()
    }

    override fun toString(): String {
        return "PlayerStats(userId=$userId)"
    }
}
