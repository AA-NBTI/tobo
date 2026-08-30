-- ================================================================
-- PILOT SCHEMA v1.0: business_resources + business_schedule_exceptions
-- SSOT v1.5 §11-9, §11-10 반영
-- DB 스키마 명세서 §1-3, §2 반영
-- ================================================================

-- 1. business_resources 테이블 (§1-3)
-- 파일럿 전제: 1인 운영, 업체당 row 1개. 다인력 확장 시 row 추가만으로 대응.
CREATE TABLE IF NOT EXISTS public.business_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  resource_name text NOT NULL DEFAULT '기본',
  capacity integer NOT NULL DEFAULT 1,  -- 파일럿은 항상 1
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public business_resources select" ON public.business_resources;
CREATE POLICY "Public business_resources select" ON public.business_resources FOR SELECT USING (true);
CREATE POLICY "Service business_resources insert" ON public.business_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Service business_resources update" ON public.business_resources FOR UPDATE USING (true);
GRANT ALL ON public.business_resources TO authenticated, service_role, anon;

-- 기존 더미 업체 5개에 기본 resource row 자동 생성
INSERT INTO public.business_resources (business_id, resource_name, capacity)
SELECT id, name, 1
FROM public.businesses
WHERE is_active = true
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 2. business_schedule_exceptions 테이블 (§2)
-- 임시휴무 토글 전용. 연장영업 등은 2차 파일럿에서 결정.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_schedule_exceptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  exception_date date NOT NULL,
  is_closed boolean NOT NULL DEFAULT true,  -- 파일럿은 휴무 토글만 지원
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, exception_date)  -- 날짜당 하나의 exception row만 허용
);

-- 연동 규칙(SSOT 8번): date_picker/time_slot 카드가 후보 계산 시
-- 반드시 이 테이블에서 is_closed=true 체크 후 제외해야 함.
-- 이 테이블을 우회하는 직접 DB 조회 코드는 SSOT 8번 원칙 위반.

ALTER TABLE public.business_schedule_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public business_schedule_exceptions select" ON public.business_schedule_exceptions;
CREATE POLICY "Public business_schedule_exceptions select" ON public.business_schedule_exceptions FOR SELECT USING (true);
CREATE POLICY "Service business_schedule_exceptions insert" ON public.business_schedule_exceptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service business_schedule_exceptions update" ON public.business_schedule_exceptions FOR UPDATE USING (true);
CREATE POLICY "Service business_schedule_exceptions delete" ON public.business_schedule_exceptions FOR DELETE USING (true);
GRANT ALL ON public.business_schedule_exceptions TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
