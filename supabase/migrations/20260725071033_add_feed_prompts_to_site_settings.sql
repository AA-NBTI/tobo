ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS feed_prompt_lite text,
ADD COLUMN IF NOT EXISTS feed_prompt_pro text;
