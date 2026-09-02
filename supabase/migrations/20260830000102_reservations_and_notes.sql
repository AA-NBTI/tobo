-- ================================================================
-- PILOT SCHEMA v1.2: reservations 컬럼 추가 + customer_notes
-- SSOT v1.5 §11-2, §11-4, §11-5, §12-1 반영
-- DB 스키마 명세서 §3, §4 반영
-- ================================================================

-- 1. reservations 테이블 신규 컬럼 추가 (§3-1)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellable_until timestamptz,           -- confirmed_at + 30분 (app level 계산)
  ADD COLUMN IF NOT EXISTS cancelled_by text
    CHECK (cancelled_by IS NULL OR cancelled_by IN ('business','system')), -- 손님 취소는 파일럿 밖
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_show_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_recorded_by uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 비즈니스 규칙 (§3-2):
-- 1. status='confirmed'이고 now()>cancellable_until 이면 업체 취소 불가(앱 레벨 강제)
-- 2. no_show=true는 페널티/금전 로직과 절대 연결하지 말 것 (기록 전용)

-- 기존 status 'pending' → 'confirmed' 변환 (명세서: confirmed/cancelled 2종만 허용)
UPDATE public.reservations SET status = 'confirmed' WHERE status = 'pending';
UPDATE public.reservations SET status = 'confirmed' WHERE status = 'completed';

-- 신규 예약 시 confirmed_at 기본값 처리 (기존 row 보정)
UPDATE public.reservations
SET
  confirmed_at = created_at,
  cancellable_until = created_at + INTERVAL '30 minutes'
WHERE confirmed_at IS NULL;

-- ----------------------------------------------------------------
-- 2. customer_notes 테이블 신규 생성 (§4)
-- 업체 대시보드 최소화면 전용. RAG 메모리(bot_memories)와 별도 분리.
-- 분리 이유: 12-1 민감정보 정책(알러지 등) 적용 시 이 테이블만 통제하면 됨.
-- ----------------------------------------------------------------
-- 주의(§4): 알러지 등 민감정보 포함 가능 → 보관기간/삭제정책은 대표 확인 필요.
-- 안프로는 임의로 영구보관 설계하지 말 것.
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,  -- user_id로 통일 (승인 #3)
  note_text text NOT NULL,
  source text NOT NULL DEFAULT 'ai_extracted'
    CHECK (source IN ('ai_extracted','owner_manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public customer_notes select" ON public.customer_notes FOR SELECT USING (true);
CREATE POLICY "Service customer_notes insert" ON public.customer_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service customer_notes update" ON public.customer_notes FOR UPDATE USING (true);
GRANT ALL ON public.customer_notes TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
