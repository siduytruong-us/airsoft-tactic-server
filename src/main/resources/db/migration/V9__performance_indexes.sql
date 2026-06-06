-- ============================================================
-- V9: Performance indexes cho các hot-path queries
-- ============================================================

-- Composite index cho lookup (match_id, user_id) trong match_players
-- Dùng bởi: joinTeam, leaveMatch, isPlayerInMatch, reportHit, WsGateway JOIN query
CREATE INDEX IF NOT EXISTS idx_match_players_match_user
  ON match_players(match_id, user_id);

-- Composite index cho hit_events với respawn_at filter
-- Dùng bởi: isAlive check trong WsGateway JOIN, reportHit idempotency check
CREATE INDEX IF NOT EXISTS idx_hits_match_user_respawn
  ON hit_events(match_id, user_id, respawn_at);

-- Partial index cho active matches (status filter rất phổ biến)
-- Dùng bởi: getActiveMatch, field live status check
CREATE INDEX IF NOT EXISTS idx_matches_active
  ON game_matches(status) WHERE status IN ('WAITING', 'IN_PROGRESS');

-- Composite index cho match_players lookup theo user + active match
-- Dùng bởi: getActiveMatch
CREATE INDEX IF NOT EXISTS idx_match_players_user_match
  ON match_players(user_id, match_id);
