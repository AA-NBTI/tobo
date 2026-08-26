-- Create reactions table
CREATE TABLE public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id UUID NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('LIKE', 'BONE_HIT', 'CRINGE', 'LOL', 'SAD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Constraint for multi-reactions (one specific reaction type per user per target)
ALTER TABLE public.reactions ADD CONSTRAINT unique_reaction UNIQUE (user_id, target_type, target_id, reaction_type);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions are viewable by everyone." ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reactions." ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions." ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- Enable Realtime for reactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
