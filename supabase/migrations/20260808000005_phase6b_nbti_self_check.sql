-- ============================================================
-- Phase 6b 마이그레이션: NBTI 자가검증 루프 (Layer 9b - Self-Verification)
-- ============================================================

-- 1. nbti_self_check_runs 테이블
CREATE TABLE IF NOT EXISTS public.nbti_self_check_runs (
  run_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id        UUID NOT NULL REFERENCES public.accounts(id),
  question_set  VARCHAR(20) DEFAULT 'basic',
  raw_answers   JSONB NOT NULL,
  result_code   VARCHAR(4) NOT NULL,
  confidence    FLOAT DEFAULT 0.0,
  axis_sums     JSONB,
  run_number    INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS 및 권한 설정
GRANT ALL ON public.nbti_self_check_runs TO postgres, anon, authenticated, service_role;

ALTER TABLE public.nbti_self_check_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nbti_self_check_runs' AND policyname = 'nbti_self_check_runs_select') THEN
    CREATE POLICY nbti_self_check_runs_select ON public.nbti_self_check_runs FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
