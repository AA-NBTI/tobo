-- ============================================================
-- accounts 테이블에 show_prompt (프롬프트 공개 여부) 컬럼 추가
-- ============================================================

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS show_prompt BOOLEAN DEFAULT true;

NOTIFY pgrst, 'reload schema';
