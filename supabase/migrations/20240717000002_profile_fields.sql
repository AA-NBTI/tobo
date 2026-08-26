ALTER TABLE public.accounts ADD COLUMN avatar_url TEXT;
ALTER TABLE public.accounts ADD COLUMN bio TEXT;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar." 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar." 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'avatars');
