-- V14: Add extra field detail columns
ALTER TABLE fields
  ADD COLUMN IF NOT EXISTS phone               VARCHAR(30),
  ADD COLUMN IF NOT EXISTS website             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS min_age             SMALLINT,
  ADD COLUMN IF NOT EXISTS entry_fee           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS entry_fee_currency  VARCHAR(3)  NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS rental_available    VARCHAR(10) NOT NULL DEFAULT 'unknown'
    CHECK (rental_available IN ('yes', 'no', 'unknown'));
