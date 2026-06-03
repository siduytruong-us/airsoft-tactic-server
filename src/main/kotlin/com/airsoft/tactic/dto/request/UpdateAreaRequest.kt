package com.airsoft.tactic.dto.request

import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

/**
 * Request cập nhật area — tất cả field đều optional (partial update).
 *
 * Ví dụ: chỉ đổi tên mà không cần gửi lại geometry:
 * { "name": "Bravo Spawn" }
 */
data class UpdateAreaRequest(
    @field:Size(max = 100, message = "Tên area tối đa 100 ký tự")
    val name: String? = null,

    @field:Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    val description: String? = null,

    @field:Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "colorHex phải là mã hex hợp lệ (VD: #FF5733)")
    val colorHex: String? = null,

    @field:Pattern(
        regexp = "^(SPAWN|OBJECTIVE|BOUNDARY|DANGER|ZONE)$",
        message = "areaType phải là một trong: SPAWN, OBJECTIVE, BOUNDARY, DANGER, ZONE"
    )
    val areaType: String? = null,

    // null = không cập nhật polygon, có giá trị = vẽ lại polygon mới
    val geometry: Map<String, Any>? = null
)
