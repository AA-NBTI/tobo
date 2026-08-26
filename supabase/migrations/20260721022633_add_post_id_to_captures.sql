ALTER TABLE public.user_captures ADD COLUMN post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
