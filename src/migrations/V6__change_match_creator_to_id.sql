-- Drop the foreign key constraint from game_matches to users
ALTER TABLE game_matches DROP CONSTRAINT IF EXISTS game_matches_created_by_fkey;

-- Rename the created_by column to created_by_id
ALTER TABLE game_matches RENAME COLUMN created_by TO created_by_id;

-- Add the new created_by_display_name column
ALTER TABLE game_matches ADD COLUMN created_by_display_name VARCHAR(255) NOT NULL DEFAULT 'Unknown';

-- Note: You might want to run a script to populate the display name for existing matches
-- For example: UPDATE game_matches SET created_by_display_name = (SELECT display_name FROM users WHERE id = created_by_id);
-- However, since we are also supporting admins, a default value is safer.
