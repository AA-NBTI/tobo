-- Grant usage and permissions to service_role, authenticated, and anon for site_settings table
GRANT ALL PRIVILEGES ON TABLE public.site_settings TO service_role;
GRANT SELECT, UPDATE, INSERT ON TABLE public.site_settings TO authenticated;
GRANT SELECT ON TABLE public.site_settings TO anon;
