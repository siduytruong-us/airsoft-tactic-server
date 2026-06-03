package com.airsoft.tactic.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(unique = true)
    var email: String? = null,

    @Column(name = "google_id", unique = true)
    var googleId: String? = null,

    @Column(name = "apple_id", unique = true)
    var appleId: String? = null,

    @Column(name = "display_name", nullable = false, length = 32)
    var displayName: String,

    @Column(name = "avatar_url")
    var avatarUrl: String? = null,

    @Column(nullable = false)
    var role: String = "player",

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: Instant? = null,

    @Column(name = "last_seen_at")
    var lastSeenAt: Instant = Instant.now(),

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
)
