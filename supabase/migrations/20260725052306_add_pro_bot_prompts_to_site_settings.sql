-- Add system prompt columns for PRO bots to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS pro_bot_prompt_1_concept TEXT,
ADD COLUMN IF NOT EXISTS pro_bot_prompt_2_script TEXT,
ADD COLUMN IF NOT EXISTS pro_bot_prompt_3_param TEXT,
ADD COLUMN IF NOT EXISTS pro_bot_prompt_4_avatar TEXT;
