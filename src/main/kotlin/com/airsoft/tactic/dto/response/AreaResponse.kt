package com.airsoft.tactic.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant
import java.util.UUID

/**
 * Response trả về cho client sau khi tạo/đọc/cập nhật area.
 *
 * Ví dụ response:
 * {
 *   "id": "abc123...",
 *   "matchId": "xyz456...",
 *   "name": "Alpha Spawn",
 *   "description": "Điểm xuất phát đội Alpha",
 *   "colorHex": "#3B82F6",
 *   "areaType": "SPAWN",
 *   "geometry": {
 *     "type": "Polygon",
 *     "coordinates": [
 *       [[106.700, 10.800], [106.710, 10.800], [106.710, 10.810], [106.700, 10.810], [106.700, 10.800]]
 *     ]
 *   },
 *   "createdAt": "2026-06-03T10:00:00Z"
 * }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AreaResponse(
    val id: UUID,
    val matchId: UUID,
    val name: String,
    val description: String?,
    val colorHex: String,
    val areaType: String,
    // geometry trả về dưới dạng GeoJSON object để frontend dùng trực tiếp với Mapbox
    val geometry: Map<String, Any>,
    val createdAt: Instant?
)
