package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

/**
 * Request tạo mới một area.
 *
 * Ví dụ request body:
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
data class CreateAreaRequest(
    @field:NotBlank(message = "Tên area không được để trống")
    @field:Size(max = 100, message = "Tên area tối đa 100 ký tự")
    val name: String,

    @field:Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    val description: String? = null,

    // Hex color code, VD: "#FF5733"
    @field:Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "colorHex phải là mã hex hợp lệ (VD: #FF5733)")
    val colorHex: String = "#FF5733",

    // Loại vùng — phải khớp CHECK constraint trong DB
    @field:Pattern(
        regexp = "^(SPAWN|OBJECTIVE|BOUNDARY|DANGER|ZONE)$",
        message = "areaType phải là một trong: SPAWN, OBJECTIVE, BOUNDARY, DANGER, ZONE"
    )
    val areaType: String = "ZONE",

    // GeoJSON geometry object từ Mapbox GL Draw
    // { "type": "Polygon", "coordinates": [...] }
    @field:NotNull(message = "geometry không được để trống")
    val geometry: Map<String, Any>
)
