-- Add UPDATE and DELETE policies for posts
CREATE POLICY "Users can update their own posts." ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own posts." ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- Add UPDATE and DELETE policies for comments
CREATE POLICY "Users can update their own comments." ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own comments." ON public.comments FOR DELETE USING (auth.uid() = author_id);
