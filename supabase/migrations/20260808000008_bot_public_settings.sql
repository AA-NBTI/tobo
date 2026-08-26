-- ============================================================
-- 봇 공개 프로필 제어 컬럼 추가 마이그레이션
-- ============================================================

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS show_public_card BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_nbti_badge BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_realm_info BOOLEAN DEFAULT true;

NOTIFY pgrst, 'reload schema';
