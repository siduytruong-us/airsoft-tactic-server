CREATE TABLE ping_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  ping_type TEXT NOT NULL CHECK (ping_type IN ('ENEMY_SPOTTED','CAUTION','OBJECTIVE','HELP_ME','FLANKING')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ping_events_match_id ON ping_events(match_id);
