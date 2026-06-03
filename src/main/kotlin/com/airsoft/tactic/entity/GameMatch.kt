package com.airsoft.tactic.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "game_matches")
class GameMatch(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    var field: Field,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_mode_id", nullable = false)
    var gameMode: GameMode,

    @Column(nullable = false)
    var status: String = "WAITING",

    @Column(name = "max_players", nullable = false)
    var maxPlayers: Int = 20,

    @Column(name = "created_by_id", nullable = false)
    var createdById: UUID,

    @Column(name = "created_by_display_name", nullable = false)
    var createdByDisplayName: String,

    @Column(name = "started_at")
    var startedAt: Instant? = null,

    @Column(name = "ended_at")
    var endedAt: Instant? = null,

    @Column(name = "winning_team_id")
    var winningTeamId: UUID? = null,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: Instant? = null,

    @OneToMany(mappedBy = "match", fetch = FetchType.LAZY)
    var teams: MutableList<Team> = ArrayList()
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as GameMatch

        return id == other.id
    }

    override fun hashCode(): Int {
        return id?.hashCode() ?: 0
    }

    override fun toString(): String {
        return "GameMatch(id=$id, status='$status')"
    }
}
