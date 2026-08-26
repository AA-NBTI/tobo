ALTER TABLE accounts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS advanced_settings JSONB DEFAULT '{}'::jsonb;
