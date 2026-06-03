package com.airsoft.tactic.entity

import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.locationtech.jts.geom.Polygon
import java.time.Instant
import java.util.UUID

/**
 * Vùng khoanh trên bản đồ của một trận đấu.
 * Frontend vẽ polygon bằng Mapbox GL Draw → gửi GeoJSON → lưu dạng PostGIS geometry.
 */
@Entity
@Table(name = "game_areas")
class GameArea(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    // Quan hệ N-1 với GameMatch — xoá match thì xoá cascade
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    var match: GameMatch,

    @Column(nullable = false)
    var name: String,

    var description: String? = null,

    // Màu hiển thị trên bản đồ (hex)
    @Column(name = "color_hex", nullable = false)
    var colorHex: String = "#FF5733",

    // Loại vùng: SPAWN, OBJECTIVE, BOUNDARY, DANGER, ZONE
    @Column(name = "area_type", nullable = false)
    var areaType: String = "ZONE",

    // PostGIS Polygon — SRID 4326 (WGS84, tương thích Mapbox GL)
    // Hibernate Spatial tự map org.locationtech.jts.geom.Polygon ↔ geometry(POLYGON,4326)
    @Column(columnDefinition = "geometry(POLYGON, 4326)", nullable = false)
    var polygon: Polygon,

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    var createdAt: Instant? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as GameArea
        return id == other.id
    }

    override fun hashCode(): Int = id?.hashCode() ?: 0

    override fun toString(): String = "GameArea(id=$id, name='$name', areaType='$areaType')"
}
