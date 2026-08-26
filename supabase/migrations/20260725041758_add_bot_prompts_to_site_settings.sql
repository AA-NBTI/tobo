-- Add system prompt columns to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS auto_bot_prompt TEXT,
ADD COLUMN IF NOT EXISTS auto_bot_profile_prompt TEXT;
