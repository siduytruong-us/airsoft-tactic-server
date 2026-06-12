-- ============================================================
-- V7: Tạo bảng game_areas để lưu vùng khoanh trên bản đồ
-- Mỗi area thuộc về 1 GameMatch, lưu polygon dạng PostGIS geometry
-- ============================================================

-- Bật PostGIS extension (idempotent - an toàn nếu đã có)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Bảng game_areas: mỗi row là một vùng polygon trên bản đồ
CREATE TABLE IF NOT EXISTS game_areas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,

    -- Tên hiển thị của vùng (VD: "Alpha Spawn", "Objective B")
    name        TEXT NOT NULL,

    description TEXT,

    -- Màu hiển thị trên bản đồ (hex, VD: "#3B82F6")
    color_hex   TEXT NOT NULL DEFAULT '#FF5733',

    -- Loại vùng: SPAWN | OBJECTIVE | BOUNDARY | DANGER | ZONE
    area_type   TEXT NOT NULL DEFAULT 'ZONE'
                    CHECK (area_type IN ('SPAWN', 'OBJECTIVE', 'BOUNDARY', 'DANGER', 'ZONE')),

    -- Polygon PostGIS — SRID 4326 (WGS84, tương thích Mapbox)
    polygon     geometry(POLYGON, 4326) NOT NULL,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index để query nhanh theo match
CREATE INDEX IF NOT EXISTS idx_game_areas_match ON game_areas(match_id);

-- Index spatial (GIST) để hỗ trợ spatial query sau này
CREATE INDEX IF NOT EXISTS idx_game_areas_polygon ON game_areas USING GIST(polygon);
