package com.airsoft.tactic.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "teams")
class Team(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    var match: GameMatch,

    @Column(nullable = false)
    var name: String,

    @Column(name = "color_hex", nullable = false)
    var colorHex: String = "#3B82F6",

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "TEXT[]")
    var objectives: Array<String>? = null,

    @Column(name = "respawn_base")
    var respawnBase: String? = null,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: Instant? = null,

    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    var players: MutableList<MatchPlayer> = ArrayList()
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as Team
        return id == other.id
    }
    override fun hashCode(): Int = id?.hashCode() ?: 0
    override fun toString(): String = "Team(id=$id, name='$name')"
}
