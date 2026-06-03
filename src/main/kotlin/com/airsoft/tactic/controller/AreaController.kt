package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.request.CreateAreaRequest
import com.airsoft.tactic.dto.request.UpdateAreaRequest
import com.airsoft.tactic.dto.response.AreaResponse
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.service.AreaService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

/**
 * API quản lý Areas (vùng khoanh trên bản đồ) của một match.
 *
 * Base path: /v1/matches/{matchId}/areas
 *
 * Endpoints:
 *   GET    /v1/matches/{matchId}/areas              — Lấy danh sách areas
 *   POST   /v1/matches/{matchId}/areas              — Tạo area mới (admin only)
 *   GET    /v1/matches/{matchId}/areas/{areaId}     — Lấy chi tiết một area
 *   PUT    /v1/matches/{matchId}/areas/{areaId}     — Cập nhật area (admin only)
 *   DELETE /v1/matches/{matchId}/areas/{areaId}     — Xoá area (admin only)
 */
@RestController
@RequestMapping("/v1/matches/{matchId}/areas")
class AreaController(private val areaService: AreaService) {

    /**
     * GET /v1/matches/{matchId}/areas
     * Lấy danh sách tất cả areas của match — mọi user đã đăng nhập đều xem được.
     *
     * Response mẫu:
     * {
     *   "data": [
     *     {
     *       "id": "abc...",
     *       "matchId": "xyz...",
     *       "name": "Alpha Spawn",
     *       "colorHex": "#3B82F6",
     *       "areaType": "SPAWN",
     *       "geometry": { "type": "Polygon", "coordinates": [...] },
     *       "createdAt": "2026-06-03T10:00:00Z"
     *     }
     *   ],
     *   "status": 200
     * }
     */
    @GetMapping
    fun list(@PathVariable matchId: UUID): ResponseEntity<ApiResponse<List<AreaResponse>>> =
        ResponseEntity.ok(ApiResponse.ok(areaService.listAreas(matchId)))

    /**
     * POST /v1/matches/{matchId}/areas
     * Tạo area mới — chỉ admin.
     *
     * Request body mẫu:
     * {
     *   "name": "Alpha Spawn",
     *   "description": "Điểm xuất phát đội Alpha",
     *   "colorHex": "#3B82F6",
     *   "areaType": "SPAWN",
     *   "geometry": {
     *     "type": "Polygon",
     *     "coordinates": [
     *       [[106.700, 10.800], [106.710, 10.800], [106.710, 10.810], [106.700, 10.810], [106.700, 10.800]]
     *     ]
     *   }
     * }
     */
    @PostMapping
    fun create(
        @PathVariable matchId: UUID,
        @Valid @RequestBody req: CreateAreaRequest,
        auth: Authentication
    ): ResponseEntity<ApiResponse<AreaResponse>> {
        requireAdmin(auth)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(areaService.createArea(matchId, req)))
    }

    /**
     * GET /v1/matches/{matchId}/areas/{areaId}
     * Lấy chi tiết một area.
     */
    @GetMapping("/{areaId}")
    fun get(
        @PathVariable matchId: UUID,
        @PathVariable areaId: UUID
    ): ResponseEntity<ApiResponse<AreaResponse>> =
        ResponseEntity.ok(ApiResponse.ok(areaService.getArea(matchId, areaId)))

    /**
     * PUT /v1/matches/{matchId}/areas/{areaId}
     * Cập nhật area — chỉ admin. Hỗ trợ partial update.
     *
     * Request body mẫu (chỉ cần gửi field muốn update):
     * { "name": "Bravo Spawn", "colorHex": "#EF4444" }
     */
    @PutMapping("/{areaId}")
    fun update(
        @PathVariable matchId: UUID,
        @PathVariable areaId: UUID,
        @Valid @RequestBody req: UpdateAreaRequest,
        auth: Authentication
    ): ResponseEntity<ApiResponse<AreaResponse>> {
        requireAdmin(auth)
        return ResponseEntity.ok(ApiResponse.ok(areaService.updateArea(matchId, areaId, req)))
    }

    /**
     * DELETE /v1/matches/{matchId}/areas/{areaId}
     * Xoá area — chỉ admin.
     */
    @DeleteMapping("/{areaId}")
    fun delete(
        @PathVariable matchId: UUID,
        @PathVariable areaId: UUID,
        auth: Authentication
    ): ResponseEntity<Void> {
        requireAdmin(auth)
        areaService.deleteArea(matchId, areaId)
        return ResponseEntity.noContent().build()
    }

    // ─── Helpers — dùng cùng pattern với MatchController ─────────────────────

    private fun requireAdmin(auth: Authentication) {
        val role = auth.authorities.firstOrNull()?.authority ?: ""
        if (!role.contains("ADMIN"))
            throw AppException.forbidden("Chỉ admin mới được thực hiện thao tác này")
    }
}
