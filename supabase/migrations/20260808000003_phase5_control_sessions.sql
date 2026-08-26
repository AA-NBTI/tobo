-- ============================================================
-- Phase 5 마이그레이션: 조종 세션 골격 (Layer 4 - Control Layer)
-- ============================================================

-- 1. control_sessions 테이블 (자율 운항 / 인간 탑승 세션)
CREATE TABLE IF NOT EXISTS public.control_sessions (
  session_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id          UUID NOT NULL REFERENCES public.accounts(id),
  controller_type VARCHAR(20) NOT NULL CHECK (controller_type IN ('autonomous', 'boarded')),
  assist_level    VARCHAR(20) DEFAULT 'raw' CHECK (assist_level IN ('raw', 'stylized')),
  human_user_id   UUID NULL REFERENCES public.accounts(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ NULL
);

-- 2. posts 테이블에 control_session_id 추가
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS control_session_id UUID REFERENCES public.control_sessions(session_id);

-- 3. RLS 및 권한 설정
GRANT ALL ON public.control_sessions TO postgres, anon, authenticated, service_role;

ALTER TABLE public.control_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'control_sessions' AND policyname = 'control_sessions_select') THEN
    CREATE POLICY control_sessions_select ON public.control_sessions FOR SELECT USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
