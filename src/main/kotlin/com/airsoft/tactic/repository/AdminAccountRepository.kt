package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.AdminAccount
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface AdminAccountRepository : JpaRepository<AdminAccount, UUID> {
    fun findByUsername(username: String): AdminAccount?
}
