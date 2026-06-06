package com.airsoft.tactic.service

import com.airsoft.tactic.dto.request.CreateAreaRequest
import com.airsoft.tactic.dto.request.UpdateAreaRequest
import com.airsoft.tactic.dto.response.AreaResponse
import com.airsoft.tactic.entity.GameArea
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.AreaRepository
import com.airsoft.tactic.repository.GameMatchRepository
import com.airsoft.tactic.util.GeoJsonUtil
import org.locationtech.jts.geom.Polygon
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AreaService(
    private val areaRepository: AreaRepository,
    private val matchRepository: GameMatchRepository
) {

    /**
     * Lấy danh sách tất cả areas của một match.
     * Trả về theo thứ tự tạo (cũ nhất trước).
     */
    fun listAreas(matchId: UUID): List<AreaResponse> {
        // Kiểm tra match tồn tại
        if (!matchRepository.existsById(matchId))
            throw AppException.notFound("Match không tồn tại: $matchId")

        return areaRepository.findByMatchIdOrderByCreatedAtAsc(matchId)
            .map { toResponse(it) }
    }

    /**
     * Tạo mới một area cho match.
     * Chỉ admin mới được tạo (kiểm tra ở Controller).
     */
    @Transactional
    fun createArea(matchId: UUID, req: CreateAreaRequest): AreaResponse {
        val match = matchRepository.findById(matchId).orElseThrow {
            AppException.notFound("Match không tồn tại: $matchId")
        }

        // Parse GeoJSON → JTS Geometry
        val geometry = try {
            GeoJsonUtil.fromGeoJson(req.geometry)
        } catch (e: Exception) {
            throw AppException.unprocessable("INVALID_GEOMETRY", "GeoJSON không hợp lệ: ${e.message}")
        }

        // Validate polygon (kiểu, hợp lệ, số điểm)
        val validationError = GeoJsonUtil.validatePolygon(geometry)
        if (validationError != null)
            throw AppException.unprocessable("INVALID_POLYGON", validationError)

        val area = GameArea(
            match = match,
            name = req.name,
            description = req.description,
            colorHex = req.colorHex,
            areaType = req.areaType,
            polygon = geometry as Polygon
        )

        return toResponse(areaRepository.save(area))
    }

    /**
     * Lấy chi tiết một area.
     * Validate area phải thuộc match (tránh IDOR).
     */
    @Transactional(readOnly = true)
    fun getArea(matchId: UUID, areaId: UUID): AreaResponse {
        val area = findAreaInMatch(matchId, areaId)
        return toResponse(area)
    }

    /**
     * Cập nhật partial area — chỉ update những field được gửi lên (không null).
     */
    @Transactional
    fun updateArea(matchId: UUID, areaId: UUID, req: UpdateAreaRequest): AreaResponse {
        val area = findAreaInMatch(matchId, areaId)

        req.name?.let { area.name = it }
        req.description?.let { area.description = it }
        req.colorHex?.let { area.colorHex = it }
        req.areaType?.let { area.areaType = it }

        // Nếu có geometry mới → parse và validate lại
        req.geometry?.let { geoJson ->
            val geometry = try {
                GeoJsonUtil.fromGeoJson(geoJson)
            } catch (e: Exception) {
                throw AppException.unprocessable("INVALID_GEOMETRY", "GeoJSON không hợp lệ: ${e.message}")
            }

            val validationError = GeoJsonUtil.validatePolygon(geometry)
            if (validationError != null)
                throw AppException.unprocessable("INVALID_POLYGON", validationError)

            area.polygon = geometry as Polygon
        }

        return toResponse(areaRepository.save(area))
    }

    /**
     * Xoá một area.
     */
    @Transactional
    fun deleteArea(matchId: UUID, areaId: UUID) {
        val area = findAreaInMatch(matchId, areaId)
        areaRepository.delete(area)
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Tìm area và kiểm tra area thuộc đúng match (chống IDOR).
     */
    private fun findAreaInMatch(matchId: UUID, areaId: UUID): GameArea {
        val area = areaRepository.findById(areaId).orElseThrow {
            AppException.notFound("Area không tồn tại: $areaId")
        }
        if (area.match.id != matchId)
            throw AppException.notFound("Area $areaId không thuộc match $matchId")
        return area
    }

    /**
     * Convert Entity → DTO, serialize polygon sang GeoJSON.
     */
    private fun toResponse(area: GameArea) = AreaResponse(
        id = area.id!!,
        matchId = area.match.id!!,
        name = area.name,
        description = area.description,
        colorHex = area.colorHex,
        areaType = area.areaType,
        // Convert JTS Polygon → GeoJSON Map để frontend dùng trực tiếp
        geometry = GeoJsonUtil.toGeoJson(area.polygon),
        createdAt = area.createdAt
    )
}
