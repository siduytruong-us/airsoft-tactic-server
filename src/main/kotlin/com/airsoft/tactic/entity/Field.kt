package com.airsoft.tactic.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "fields")
class Field(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var location: String,

    var lat: Double? = null,
    var lng: Double? = null,

    @Column(name = "cover_image_url")
    var coverImageUrl: String? = null,

    var description: String? = null,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: Instant? = null,

    @OneToMany(mappedBy = "field", fetch = FetchType.LAZY)
    var gameModes: MutableList<GameMode> = ArrayList()
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as Field

        return id == other.id
    }

    override fun hashCode(): Int {
        return id?.hashCode() ?: 0
    }

    override fun toString(): String {
        return "Field(id=$id, name='$name', isActive=$isActive)"
    }
}
