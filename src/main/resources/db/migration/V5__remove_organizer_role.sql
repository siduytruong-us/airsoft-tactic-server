-- Update existing users with 'organizer' role to 'admin'
UPDATE users SET role = 'admin' WHERE role = 'organizer';

-- Remove 'organizer' from the check constraint
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('player', 'admin'));
