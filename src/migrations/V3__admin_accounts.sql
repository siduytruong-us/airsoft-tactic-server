-- Admin accounts — separate from auth.users, login via username/password only
CREATE TABLE IF NOT EXISTS admin_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username     TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Admin',
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Seed default admin (password: Admin@123 — CHANGE IN PRODUCTION)
-- BCrypt hash of "Admin@123"
INSERT INTO admin_accounts (username, password_hash, display_name)
VALUES ('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCokl7LlBmO2zALZECXhDOi', 'Super Admin')
ON CONFLICT DO NOTHING;
