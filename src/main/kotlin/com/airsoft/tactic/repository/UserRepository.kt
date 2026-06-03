package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID> {
    fun findByGoogleId(googleId: String): User?
    fun findByAppleId(appleId: String): User?
    fun findByEmail(email: String): User?
}
