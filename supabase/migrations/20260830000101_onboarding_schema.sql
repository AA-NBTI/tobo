-- ================================================================
-- PILOT SCHEMA v1.1: onboarding + business_services + presets + seating
-- SSOT v1.5 §13, §11-1(→13) 반영
-- DB 스키마 명세서 §1-1, §1-2, §1-4, §1-5 반영
-- ================================================================

-- 1. businesses 테이블 신규 컬럼 추가 (§1-1)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'ai_in_progress'
    CHECK (onboarding_status IN ('ai_in_progress','ai_completed','pending_review','approved')),
  ADD COLUMN IF NOT EXISTS last_onboarding_stage integer,          -- 13-5: 이어하기용 (0~6)
  ADD COLUMN IF NOT EXISTS business_registration_number text,      -- 13-8: 국세청 진위확인 대상
  ADD COLUMN IF NOT EXISTS registration_verified boolean NOT NULL DEFAULT false, -- 13-8 하드 게이트
  ADD COLUMN IF NOT EXISTS registration_verified_at timestamptz;   -- 검증 완료 시각

-- 기존 더미 업체 5개: onboarding_status='approved' 처리 (승인 #1)
-- 이미 운영 중인 업체가 손님 화면에서 필터링되지 않도록 보호
UPDATE public.businesses
SET
  onboarding_status = 'approved',
  registration_verified = true,             -- 파일럿 스텁: TODO 실제 API 연동 전까지 임시 우회
  registration_verified_at = now()
WHERE is_active = true;

-- ----------------------------------------------------------------
-- 2. business_services 테이블 신규 생성 (§1-2)
-- 기존 services 테이블과 병존 (deprecated 유지, 데이터 이관)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  service_name text NOT NULL,
  duration_minutes integer NOT NULL,
  price integer,                            -- 파일럿: 표시만, 결제 미연동(11-8 보류)
  is_active boolean NOT NULL DEFAULT true,
  origin text NOT NULL DEFAULT 'preset_selected'
    CHECK (origin IN ('preset_selected','ai_extracted_new','owner_manual_correction')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 기존 services 테이블 데이터 이관 (승인 #2)
INSERT INTO public.business_services (business_id, service_name, duration_minutes, price, is_active, origin)
SELECT
  business_id,
  name,
  COALESCE(duration_minutes, 60),
  CASE WHEN price = 0 THEN NULL ELSE price END,
  is_active,
  'preset_selected'
FROM public.services
ON CONFLICT DO NOTHING;

ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public business_services select" ON public.business_services;
CREATE POLICY "Public business_services select" ON public.business_services FOR SELECT USING (true);
CREATE POLICY "Service business_services all" ON public.business_services FOR ALL WITH CHECK (true);
GRANT ALL ON public.business_services TO authenticated, service_role, anon;

-- ----------------------------------------------------------------
-- 3. service_preset_suggestions 테이블 신규 생성 (§1-4)
-- AI 등록 상담 중 프리셋에 없는 신규 서비스 감지 시 누적
-- unmet_demand_log와 동일 원리 — 업체가 늘수록 프리셋이 자동으로 풍부해짐
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_preset_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  suggested_service_name text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  promoted_to_preset boolean NOT NULL DEFAULT false,  -- 프리셋 승격 여부
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, suggested_service_name)
);

ALTER TABLE public.service_preset_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service preset suggestions select" ON public.service_preset_suggestions FOR SELECT USING (true);
CREATE POLICY "Service preset suggestions insert" ON public.service_preset_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service preset suggestions update" ON public.service_preset_suggestions FOR UPDATE USING (true);
GRANT ALL ON public.service_preset_suggestions TO authenticated, service_role, anon;

-- ----------------------------------------------------------------
-- 4. business_seating_config 테이블 신규 생성 (§1-5)
-- pet_dining 전용. grooming/clinic/hotel/pension은 business_services로 처리.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_seating_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE, -- pet_dining만 row 존재
  pet_friendly_table_count integer NOT NULL,
  max_party_size_per_table integer NOT NULL,
  average_turn_minutes integer NOT NULL DEFAULT 60,
  seating_type text[] NOT NULL DEFAULT '{}',  -- ['indoor','terrace'] — 손님용 매칭조건과 값 대칭 필수
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_seating_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public seating config select" ON public.business_seating_config FOR SELECT USING (true);
CREATE POLICY "Service seating config all" ON public.business_seating_config FOR ALL WITH CHECK (true);
GRANT ALL ON public.business_seating_config TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
