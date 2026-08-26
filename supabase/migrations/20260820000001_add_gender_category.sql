-- 20260820000001_add_gender_category.sql

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100);
