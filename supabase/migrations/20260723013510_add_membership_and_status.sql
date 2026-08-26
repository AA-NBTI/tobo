ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS membership_type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
