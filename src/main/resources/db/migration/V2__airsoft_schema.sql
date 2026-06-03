-- ============================================================
-- AirsoftTac — Full Schema Migration V1
-- ============================================================

-- Users (Spring Boot manages auth, not Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE,
    google_id       TEXT UNIQUE,
    apple_id        TEXT UNIQUE,
    display_name    VARCHAR(32) NOT NULL DEFAULT 'Player',
    avatar_url      TEXT,
    role            TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','organizer','admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Refresh tokens (rotation-based)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Device tokens (FCM/APNs)
CREATE TABLE IF NOT EXISTS device_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT NOT NULL,
    platform    TEXT NOT NULL CHECK (platform IN ('android','ios')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- Fields (airsoft venues)
CREATE TABLE IF NOT EXISTS fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    location        TEXT NOT NULL,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    cover_image_url TEXT,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game modes (per field)
CREATE TABLE IF NOT EXISTS game_modes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id                UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    description             TEXT,
    rules                   TEXT[],
    max_players             INT NOT NULL DEFAULT 20,
    team_count              INT NOT NULL DEFAULT 2,
    respawn_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    respawn_delay_seconds   INT NOT NULL DEFAULT 30,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    description     TEXT,
    field_id        UUID NOT NULL REFERENCES fields(id),
    organizer_id    UUID NOT NULL REFERENCES users(id),
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    max_capacity    INT NOT NULL DEFAULT 40,
    status          TEXT NOT NULL DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming','ongoing','cancelled','completed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_field ON events(field_id);

-- RSVPs
CREATE TABLE IF NOT EXISTS rsvps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

-- Game matches
CREATE TABLE IF NOT EXISTS game_matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id        UUID NOT NULL REFERENCES fields(id),
    game_mode_id    UUID NOT NULL REFERENCES game_modes(id),
    status          TEXT NOT NULL DEFAULT 'WAITING'
                        CHECK (status IN ('WAITING','IN_PROGRESS','ENDED')),
    max_players     INT NOT NULL DEFAULT 20,
    created_by      UUID NOT NULL REFERENCES users(id),
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    winning_team_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_matches_field ON game_matches(field_id);
CREATE INDEX idx_matches_status ON game_matches(status);

-- Teams (per match)
CREATE TABLE IF NOT EXISTS teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id        UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    color_hex       TEXT NOT NULL DEFAULT '#3B82F6',
    objectives      TEXT[],
    respawn_base    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_teams_match ON teams(match_id);

-- FK from game_matches to teams (winning team)
ALTER TABLE game_matches
    ADD CONSTRAINT fk_winning_team
    FOREIGN KEY (winning_team_id) REFERENCES teams(id);

-- Match players
CREATE TABLE IF NOT EXISTS match_players (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,
    team_id     UUID NOT NULL REFERENCES teams(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (match_id, user_id)
);
CREATE INDEX idx_match_players_match ON match_players(match_id);
CREATE INDEX idx_match_players_user ON match_players(user_id);

-- Hit events (in-game)
CREATE TABLE IF NOT EXISTS hit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES game_matches(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    respawn_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_hits_match_user ON hit_events(match_id, user_id);

-- Player stats
CREATE TABLE IF NOT EXISTS player_stats (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_matches   INT NOT NULL DEFAULT 0,
    wins            INT NOT NULL DEFAULT 0,
    losses          INT NOT NULL DEFAULT 0,
    draws           INT NOT NULL DEFAULT 0,
    total_kills     INT NOT NULL DEFAULT 0,
    total_deaths    INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed sample field + game mode for testing
INSERT INTO fields (id, name, location, cover_image_url, description, is_active)
VALUES (
    'f1a2b3c4-0000-0000-0000-000000000001',
    'Jungle Zone Alpha',
    'Thủ Đức, TP.HCM',
    null,
    'A dense jungle-themed field with multiple capture points.',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO game_modes (id, field_id, name, description, rules, max_players, team_count, respawn_enabled, respawn_delay_seconds)
VALUES (
    'gm000001-0000-0000-0000-000000000001',
    'f1a2b3c4-0000-0000-0000-000000000001',
    'Team Deathmatch',
    'Eliminate the opposing team. Last team standing wins.',
    ARRAY['Hit player must call HIT and move to respawn base',
          'Friendly fire counts as a hit',
          'Match ends when one team reaches 0 respawn tokens'],
    20, 2, true, 30
) ON CONFLICT DO NOTHING;
