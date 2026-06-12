-- Run against PostgreSQL before starting server:
-- psql $DATABASE_URL -f src/migrations/V10__match_flow_refactor.sql

-- 1. Strip game_modes: remove columns now moved down to game_matches
ALTER TABLE game_modes DROP COLUMN IF EXISTS max_players;
ALTER TABLE game_modes DROP COLUMN IF EXISTS team_count;
ALTER TABLE game_modes DROP COLUMN IF EXISTS respawn_enabled;
ALTER TABLE game_modes DROP COLUMN IF EXISTS respawn_delay_seconds;
ALTER TABLE game_modes ALTER COLUMN field_id DROP NOT NULL;

-- 2. Add columns to game_matches
ALTER TABLE game_matches ADD COLUMN IF NOT EXISTS team_count INT NOT NULL DEFAULT 2;
ALTER TABLE game_matches ADD COLUMN IF NOT EXISTS respawn_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE game_matches ADD COLUMN IF NOT EXISTS respawn_delay_seconds INT NOT NULL DEFAULT 30;
ALTER TABLE game_matches ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ NULL;
ALTER TABLE game_matches ADD COLUMN IF NOT EXISTS map_id UUID NULL;

-- 3. Maps table (template)
CREATE TABLE IF NOT EXISTS maps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id         UUID REFERENCES fields(id) ON DELETE SET NULL,
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  is_public        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Map areas table
CREATE TABLE IF NOT EXISTS map_areas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id       UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  color_hex    VARCHAR(7) NOT NULL DEFAULT '#FF6B35',
  area_type    VARCHAR(50) NOT NULL DEFAULT 'ZONE',
  boundary     geometry(POLYGON, 4326) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. FK map_id on game_matches
ALTER TABLE game_matches ADD CONSTRAINT fk_game_matches_map
  FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE SET NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_game_matches_field_id        ON game_matches(field_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_status          ON game_matches(status);
CREATE INDEX IF NOT EXISTS idx_match_players_match_user     ON match_players(match_id, user_id);
CREATE INDEX IF NOT EXISTS idx_hit_events_match_user_ra     ON hit_events(match_id, user_id, respawn_at);
CREATE INDEX IF NOT EXISTS idx_game_areas_match_id          ON game_areas(match_id);
CREATE INDEX IF NOT EXISTS idx_map_areas_map_id             ON map_areas(map_id);
CREATE INDEX IF NOT EXISTS idx_ping_events_match_id         ON ping_events(match_id);
