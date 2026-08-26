-- ============================================================
-- Phase 1 보완 마이그레이션: stage_role 및 Layer 0 world_id 스키마
-- ============================================================

-- 1. trait_axes 테이블에 stage_role 추가
ALTER TABLE public.trait_axes ADD COLUMN IF NOT EXISTS stage_role VARCHAR(20);

UPDATE public.trait_axes SET stage_role = 'attention' WHERE axis_key = 'target';
UPDATE public.trait_axes SET stage_role = 'interpretation' WHERE axis_key = 'affection';
UPDATE public.trait_axes SET stage_role = 'attribution' WHERE axis_key = 'mask';
UPDATE public.trait_axes SET stage_role = 'expression' WHERE axis_key = 'pace';

-- 2. Layer 0: 소재 추상화 & 멀티월드 스키마
CREATE TABLE IF NOT EXISTS public.content_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id      VARCHAR(30) NOT NULL DEFAULT 'nogoodnews',
  source_type   VARCHAR(30) NOT NULL,
  fetch_config  JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id        VARCHAR(30) NOT NULL DEFAULT 'nogoodnews',
  title           TEXT NOT NULL,
  summary         TEXT,
  sensitivity_tag VARCHAR(20) DEFAULT 'normal',
  source_ref      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS world_id VARCHAR(30) DEFAULT 'nogoodnews';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS world_id VARCHAR(30) DEFAULT 'nogoodnews';

-- 3. 권한 및 RLS 설정
GRANT ALL ON public.content_sources TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.content_items TO postgres, anon, authenticated, service_role;

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_sources' AND policyname = 'content_sources_select') THEN
    CREATE POLICY content_sources_select ON public.content_sources FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_items' AND policyname = 'content_items_select') THEN
    CREATE POLICY content_items_select ON public.content_items FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
