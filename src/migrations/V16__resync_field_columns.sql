-- V16: Re-apply V14/V15 column additions on `fields`.
--
-- Context: when this server first connected to the Supabase Postgres project,
-- `schema_migrations` was empty but the `fields` table already existed (restored
-- from an earlier schema snapshot). The bootstrap logic in database.module.ts
-- marked ALL existing migration files (including V14/V15) as "applied" without
-- actually running them, so these columns were never created on Supabase.
--
-- This file has a NEW version (V16), so it is not in `schema_migrations` yet and
-- will run automatically on next server start — no manual SQL needed.
-- All statements are idempotent (IF NOT EXISTS), safe to re-run anytime.

ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS phone               VARCHAR(30),
  ADD COLUMN IF NOT EXISTS website             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS min_age             SMALLINT,
  ADD COLUMN IF NOT EXISTS entry_fee           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS entry_fee_currency  VARCHAR(3)  NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS rental_available    VARCHAR(10) NOT NULL DEFAULT 'unknown'
    CHECK (rental_available IN ('yes', 'no', 'unknown'));

ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
