package com.airsoft.tactic.repository

import com.airsoft.tactic.entity.GameArea
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface AreaRepository : JpaRepository<GameArea, UUID> {

    // Lấy tất cả areas của một match, sắp xếp theo thời gian tạo
    fun findByMatchIdOrderByCreatedAtAsc(matchId: UUID): List<GameArea>

    // Xoá tất cả areas của một match (dùng khi reset game)
    fun deleteByMatchId(matchId: UUID)

    // Kiểm tra area có thuộc match không (bảo vệ authorization)
    @Query("SELECT COUNT(a) > 0 FROM GameArea a WHERE a.id = :areaId AND a.match.id = :matchId")
    fun existsByIdAndMatchId(areaId: UUID, matchId: UUID): Boolean
}
