-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('reaction', 'comment', 'follow')),
    target_id UUID, -- For 'follow', it can be null. For 'reaction'/'comment', it is the post/comment ID
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and Realtime
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 1. Trigger for follows
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_follow_notification
AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.handle_new_follow();

-- 2. Trigger for comments
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
BEGIN
    SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    
    IF post_author_id != NEW.author_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, target_id)
        VALUES (post_author_id, NEW.author_id, 'comment', NEW.post_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_comment_notification
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- 3. Trigger for reactions
CREATE OR REPLACE FUNCTION public.handle_new_reaction()
RETURNS TRIGGER AS $$
DECLARE
    target_author_id UUID;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT author_id INTO target_author_id FROM public.posts WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
        SELECT author_id INTO target_author_id FROM public.comments WHERE id = NEW.comment_id;
    END IF;

    IF target_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, target_id)
        VALUES (target_author_id, NEW.user_id, 'reaction', COALESCE(NEW.post_id, NEW.comment_id));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_reaction_notification
AFTER INSERT ON public.reactions
FOR EACH ROW EXECUTE FUNCTION public.handle_new_reaction();
