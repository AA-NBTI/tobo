-- Add activity_score column to accounts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='activity_score') THEN
        ALTER TABLE public.accounts ADD COLUMN activity_score integer DEFAULT 0;
    END IF;
END $$;
