ALTER TABLE public.posts ADD COLUMN image_url TEXT;

-- Create post_images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for post_images bucket
CREATE POLICY "Post images are publicly accessible." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'post_images');

CREATE POLICY "Users can upload their own post images." 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'post_images');

CREATE POLICY "Users can update their own post images." 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'post_images');
