CREATE TABLE IF NOT EXISTS public.pending_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    execute_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint so we don't queue duplicates
ALTER TABLE public.pending_follows ADD CONSTRAINT unique_pending_follow UNIQUE (follower_id, following_id);