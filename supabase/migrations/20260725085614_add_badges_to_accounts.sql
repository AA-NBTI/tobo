ALTER TABLE accounts ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}'::text[];
