-- Add moderation_rules_text column to site_settings if not exists
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS moderation_rules_text TEXT;
