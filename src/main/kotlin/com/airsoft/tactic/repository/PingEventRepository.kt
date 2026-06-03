package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.PingEvent
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PingEventRepository : JpaRepository<PingEvent, UUID>
