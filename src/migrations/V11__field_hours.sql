CREATE TABLE field_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(field_id, day_of_week)
);
CREATE INDEX idx_field_hours_field_id ON field_hours(field_id);
