-- ============================================================
-- Phase 8 마이그레이션: 데이터 피드백 & 개인화 엔진 (Layer 10)
-- ============================================================

-- 1. axis_combo_stats 테이블 (판단축 조합별 성과 통계)
CREATE TABLE IF NOT EXISTS public.axis_combo_stats (
  type_code       VARCHAR(10) PRIMARY KEY,
  period_start    DATE NOT NULL DEFAULT CURRENT_DATE,
  total_reactions JSONB DEFAULT '{"bone_strike":0,"impact":0,"like":0,"funny":0,"sad":0}'::jsonb,
  sample_size     INT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_taste_vectors 테이블 (유저별 케미 취향 벡터)
CREATE TABLE IF NOT EXISTS public.user_taste_vectors (
  user_id      UUID REFERENCES public.accounts(id),
  axis_key     VARCHAR(30) REFERENCES public.trait_axes(axis_key),
  weighted_avg FLOAT DEFAULT 5.0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, axis_key)
);

-- 3. RLS 및 권한 설정
GRANT ALL ON public.axis_combo_stats TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_taste_vectors TO postgres, anon, authenticated, service_role;

ALTER TABLE public.axis_combo_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_taste_vectors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'axis_combo_stats' AND policyname = 'axis_combo_stats_select') THEN
    CREATE POLICY axis_combo_stats_select ON public.axis_combo_stats FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_taste_vectors' AND policyname = 'user_taste_vectors_select') THEN
    CREATE POLICY user_taste_vectors_select ON public.user_taste_vectors FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
