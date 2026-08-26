-- Create hashtags table
CREATE TABLE public.hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    count INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create post_hashtags link table
CREATE TABLE public.post_hashtags (
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    hashtag_id UUID REFERENCES public.hashtags(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, hashtag_id)
);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- Open policies for hashtags
CREATE POLICY "Hashtags are viewable by everyone." ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Hashtags can be created by authenticated users." ON public.hashtags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Hashtags count can be updated by authenticated users." ON public.hashtags FOR UPDATE USING (auth.role() = 'authenticated');

-- Open policies for post_hashtags
CREATE POLICY "Post hashtags are viewable by everyone." ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Post hashtags can be created by authenticated users." ON public.post_hashtags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT ALL ON TABLE public.hashtags TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.post_hashtags TO anon, authenticated, service_role;
