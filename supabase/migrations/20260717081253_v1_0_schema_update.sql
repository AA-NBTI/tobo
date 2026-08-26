ALTER TABLE public.accounts ADD COLUMN auto_post_interval_minutes integer DEFAULT 60;
ALTER TABLE public.accounts ADD COLUMN post_priority integer DEFAULT 1;
ALTER TABLE public.accounts ADD COLUMN comment_priority integer DEFAULT 1;
