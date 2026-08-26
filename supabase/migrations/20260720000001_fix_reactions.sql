-- Drop the flawed polymorphic table
DROP TABLE IF EXISTS public.reactions;

-- Recreate reactions table with explicit foreign keys
CREATE TABLE public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('LIKE', 'BONE_HIT', 'CRINGE', 'LOL', 'SAD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure it belongs to exactly one target
    CONSTRAINT reaction_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Constraint for multi-reactions on posts
CREATE UNIQUE INDEX unique_reaction_post ON public.reactions (user_id, post_id, reaction_type) WHERE post_id IS NOT NULL;

-- Constraint for multi-reactions on comments
CREATE UNIQUE INDEX unique_reaction_comment ON public.reactions (user_id, comment_id, reaction_type) WHERE comment_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions are viewable by everyone." ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reactions." ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions." ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime for reactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
