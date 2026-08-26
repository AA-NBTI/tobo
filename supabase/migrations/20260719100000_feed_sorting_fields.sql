-- Add views_count and comments_count to posts table
ALTER TABLE public.posts ADD COLUMN views_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.posts ADD COLUMN comments_count INTEGER DEFAULT 0 NOT NULL;

-- Add username to accounts table if not exists
ALTER TABLE public.accounts ADD COLUMN username TEXT;

-- Backfill comments_count for existing posts
UPDATE public.posts p
SET comments_count = (
    SELECT COUNT(*)
    FROM public.comments c
    WHERE c.post_id = p.id
);

-- Create function to update comments_count on posts table automatically
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on comments table
CREATE TRIGGER tr_update_post_comments_count
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Create RPC function to increment post views safely
CREATE OR REPLACE FUNCTION public.increment_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.posts
    SET views_count = views_count + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
