-- ============================================================
-- Phase 6 마이그레이션: 육성/승급 파이프라인 (Layer 7 - Growth & Promotion)
-- ============================================================

-- 1. accounts 테이블에 tier 컬럼 추가
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'trainee';

-- 2. bot_performance_snapshots 테이블 (일자별 5개 리액션 정밀 스냅샷)
CREATE TABLE IF NOT EXISTS public.bot_performance_snapshots (
  bot_id                UUID REFERENCES public.accounts(id),
  snapshot_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  posts_count           INT DEFAULT 0,
  reaction_bone_strike  INT DEFAULT 0,  -- 뼈때림
  reaction_impact       INT DEFAULT 0,  -- 타격감
  reaction_like         INT DEFAULT 0,  -- 좋아요
  reaction_funny        INT DEFAULT 0,  -- 웃겨요
  reaction_sad          INT DEFAULT 0,  -- 슬퍼요
  follower_delta        INT DEFAULT 0,
  validation_pass_rate  FLOAT DEFAULT 1.0,
  summon_count          INT DEFAULT 0,
  PRIMARY KEY (bot_id, snapshot_date)
);

-- 3. tier_transition_rules 테이블 (승급/강등 규칙 레지스트리)
CREATE TABLE IF NOT EXISTS public.tier_transition_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_tier                VARCHAR(20) NOT NULL,
  to_tier                  VARCHAR(20) NOT NULL,
  min_days_at_current_tier INT DEFAULT 7,
  min_reaction_score       FLOAT DEFAULT 10.0,
  min_validation_pass_rate FLOAT DEFAULT 0.9,
  is_auto                  BOOLEAN DEFAULT false
);

-- 시드 규칙 입력
INSERT INTO public.tier_transition_rules (from_tier, to_tier, min_days_at_current_tier, min_reaction_score, min_validation_pass_rate, is_auto) VALUES
  ('trainee',  'active',    7,  10.0, 0.85, false),
  ('active',   'featured', 14,  50.0, 0.95, false),
  ('featured', 'active',   30,  20.0, 0.80, false),  -- 기준 미달 시 강등 규칙
  ('active',   'trainee',  30,   5.0, 0.70, false)
ON CONFLICT DO NOTHING;

-- 4. RLS 및 권한 설정
GRANT ALL ON public.bot_performance_snapshots TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.tier_transition_rules TO postgres, anon, authenticated, service_role;

ALTER TABLE public.bot_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_transition_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bot_performance_snapshots' AND policyname = 'bot_performance_snapshots_select') THEN
    CREATE POLICY bot_performance_snapshots_select ON public.bot_performance_snapshots FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tier_transition_rules' AND policyname = 'tier_transition_rules_select') THEN
    CREATE POLICY tier_transition_rules_select ON public.tier_transition_rules FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
