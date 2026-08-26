-- 1. Add capture_id to reactions table
ALTER TABLE public.reactions ADD COLUMN capture_id UUID REFERENCES public.user_captures(id) ON DELETE CASCADE;

-- 2. Update the reaction trigger to handle capture notifications
CREATE OR REPLACE FUNCTION public.handle_new_reaction()
RETURNS TRIGGER AS $$
DECLARE
    target_author_id UUID;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT author_id INTO target_author_id FROM public.posts WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
        SELECT author_id INTO target_author_id FROM public.comments WHERE id = NEW.comment_id;
    ELSIF NEW.capture_id IS NOT NULL THEN
        SELECT user_id INTO target_author_id FROM public.user_captures WHERE id = NEW.capture_id;
    END IF;

    IF target_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, target_id)
        VALUES (target_author_id, NEW.user_id, 'reaction', COALESCE(NEW.post_id, NEW.comment_id, NEW.capture_id));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
