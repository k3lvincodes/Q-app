-- Add unlock_hint column to gifts table
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS unlock_hint TEXT;
