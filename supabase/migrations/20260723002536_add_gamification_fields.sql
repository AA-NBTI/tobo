-- Add Gamification Fields to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bot_class VARCHAR(50) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
