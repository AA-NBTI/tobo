-- Create follows table
CREATE TABLE public.follows (
    follower_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- Ensure a user cannot follow themselves
ALTER TABLE public.follows ADD CONSTRAINT cannot_follow_self CHECK (follower_id != following_id);

-- Add counts to accounts table
ALTER TABLE public.accounts ADD COLUMN followers_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.accounts ADD COLUMN following_count INTEGER DEFAULT 0 NOT NULL;

-- Trigger to update counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.accounts SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.accounts SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.accounts SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
        UPDATE public.accounts SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_update_follow_counts
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- RLS and Privileges
GRANT ALL ON TABLE public.follows TO anon, authenticated, service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone." ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can insert their own follows." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete their own follows." ON public.follows FOR DELETE USING (auth.uid() = follower_id);
