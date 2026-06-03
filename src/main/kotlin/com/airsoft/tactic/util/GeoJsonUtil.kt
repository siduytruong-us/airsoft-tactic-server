package com.airsoft.tactic.util

import com.fasterxml.jackson.databind.ObjectMapper
import org.locationtech.jts.geom.Geometry
import org.locationtech.jts.geom.GeometryFactory
import org.locationtech.jts.geom.Polygon
import org.locationtech.jts.geom.PrecisionModel
import org.wololo.jts2geojson.GeoJSONReader
import org.wololo.jts2geojson.GeoJSONWriter

/**
 * Utility chuyển đổi giữa GeoJSON (Map<String, Any>) và JTS Geometry.
 *
 * SRID 4326 = WGS84 — chuẩn tọa độ của Mapbox GL.
 * Coordinate order: [longitude, latitude] (đúng GeoJSON spec RFC 7946).
 */
object GeoJsonUtil {

    // GeometryFactory với SRID 4326
    private val geometryFactory = GeometryFactory(PrecisionModel(), 4326)
    private val reader = GeoJSONReader()
    private val writer = GeoJSONWriter()
    private val objectMapper = ObjectMapper()

    /**
     * Chuyển GeoJSON geometry object → JTS Geometry.
     * Input là Map đại diện cho GeoJSON geometry:
     * { "type": "Polygon", "coordinates": [[[lng, lat], ...]] }
     */
    fun fromGeoJson(geometryMap: Map<String, Any>): Geometry {
        val json = objectMapper.writeValueAsString(geometryMap)
        val geoJsonGeometry = org.wololo.geojson.GeoJSONFactory.create(json)
        val geometry = reader.read(geoJsonGeometry, geometryFactory)
        // Gán SRID để Hibernate Spatial biết hệ tọa độ
        geometry.srid = 4326
        return geometry
    }

    /**
     * Chuyển JTS Geometry → GeoJSON geometry object (Map).
     * Output dùng làm field "geometry" trong AreaResponse.
     */
    @Suppress("UNCHECKED_CAST")
    fun toGeoJson(geometry: Geometry): Map<String, Any> {
        val geoJsonGeometry = writer.write(geometry)
        return objectMapper.readValue(geoJsonGeometry.toString(), Map::class.java) as Map<String, Any>
    }

    /**
     * Validate polygon hợp lệ:
     * - Phải là kiểu Polygon (không phải MultiPolygon, LineString, ...)
     * - Polygon phải valid theo JTS (không tự cắt nhau, ring phải đóng)
     * - Tối thiểu 4 điểm (3 góc + điểm đóng)
     */
    fun validatePolygon(geometry: Geometry): String? {
        if (geometry !is Polygon) return "Geometry phải là kiểu Polygon"
        if (!geometry.isValid) return "Polygon không hợp lệ (tự cắt nhau hoặc ring không đóng)"
        if (geometry.exteriorRing.numPoints < 4) return "Polygon cần tối thiểu 3 điểm (4 tọa độ kể cả điểm đóng)"
        return null // null = hợp lệ
    }
}
