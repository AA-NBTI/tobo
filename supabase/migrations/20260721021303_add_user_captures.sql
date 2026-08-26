-- 1. Create user_captures table
CREATE TABLE public.user_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.user_captures ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_captures table
-- Anyone can see user captures
CREATE POLICY "Captures are viewable by everyone." ON public.user_captures FOR SELECT USING (true);
-- Only the user themselves can insert/delete their captures
CREATE POLICY "Users can insert their own captures." ON public.user_captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own captures." ON public.user_captures FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.user_captures TO anon, authenticated, service_role;

-- 4. Create captures bucket in storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('captures', 'captures', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies for captures bucket
CREATE POLICY "Public Access for captures" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'captures');

CREATE POLICY "Allow authenticated inserts to captures"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'captures');

CREATE POLICY "Users Delete their own captures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'captures' AND auth.uid() = owner);
