-- Create site_settings table to store global configurations like site logo
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO public.site_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Public can view site settings" 
    ON public.site_settings FOR SELECT 
    USING (true);

-- Admins can update
CREATE POLICY "Admins can update site settings" 
    ON public.site_settings FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE accounts.id = auth.uid() AND accounts.is_admin = true
        )
    );
