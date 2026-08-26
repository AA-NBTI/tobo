-- Add level column to accounts table
ALTER TABLE accounts ADD COLUMN level INT DEFAULT 1;

-- Add check constraint for levels 1 through 10
ALTER TABLE accounts ADD CONSTRAINT level_check CHECK (level >= 1 AND level <= 10);
