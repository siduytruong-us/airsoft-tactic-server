-- Supabase Auth stub for local Docker development
-- Supabase cung cấp schema "auth" với auth.uid() built-in.
-- Vanilla PostgreSQL không có — tạo stub để Flyway migrations chạy được.
-- auth.uid() trả về NULL vì local dùng custom JWT, không dùng Supabase Auth.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULL::uuid;
$$;
