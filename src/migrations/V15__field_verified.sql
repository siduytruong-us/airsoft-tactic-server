-- V15: Add is_verified badge column to fields
ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
