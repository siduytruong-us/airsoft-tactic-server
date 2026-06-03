package com.airsoft.tactic.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "game_modes")
class GameMode(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    var field: Field,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "TEXT[]")
    var rules: Array<String>? = null,

    @Column(name = "max_players", nullable = false)
    var maxPlayers: Int = 20,

    @Column(name = "team_count", nullable = false)
    var teamCount: Int = 2,

    @Column(name = "respawn_enabled", nullable = false)
    var respawnEnabled: Boolean = true,

    @Column(name = "respawn_delay_seconds", nullable = false)
    var respawnDelaySeconds: Int = 30,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: Instant? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as GameMode
        return id == other.id
    }
    override fun hashCode(): Int = id?.hashCode() ?: 0
    override fun toString(): String = "GameMode(id=$id, name='$name')"
}
