-- ================================================================
-- PHASE 4: 지능형 컨시어지 예약 엔진 고도화 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- 1. businesses 테이블 확장 (정식 컬럼 + 하이브리드 JSON)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS pet_size TEXT; -- small, medium, large, etc.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS price_range TEXT; -- $, $$, $$$, $$$$
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS meta_json JSONB DEFAULT '{}'::jsonb; -- 검색 안되는 부가 설명용

-- 2. card_templates 테이블 생성 (카드 확장성 보장)
CREATE TABLE IF NOT EXISTS public.card_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_type text UNIQUE NOT NULL, -- 예: service_select, date_picker, time_slot
  required_slots text[] NOT NULL DEFAULT '{}', -- 이 카드가 타겟팅하는 빈 슬롯 이름
  priority integer NOT NULL DEFAULT 99, -- 숫자가 작을수록 먼저 물어봄 (1순위, 2순위...)
  schema_json jsonb DEFAULT '{}'::jsonb, -- 프론트엔드 렌더링용 추가 메타데이터
  created_at timestamptz DEFAULT now()
);

-- 초기 필수 카드 템플릿 5종 삽입 (결정론적 상태 머신을 위한 우선순위 세팅)
INSERT INTO public.card_templates (card_type, required_slots, priority)
VALUES 
  ('service_select', '{service_id}', 10),
  ('date_picker', '{date}', 20),
  ('time_slot', '{time_slot}', 30),
  ('party_size', '{party_size}', 40),
  ('contact_confirm', '{contact_confirm}', 50)
ON CONFLICT (card_type) DO UPDATE 
SET required_slots = EXCLUDED.required_slots, priority = EXCLUDED.priority;

-- 3. interaction_logs 테이블 생성 (데이터 선순환 및 학습용)
CREATE TABLE IF NOT EXISTS public.interaction_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'impression', 'click', 'book', 'cancel'
  card_type text, -- 노출된 카드 종류
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  slot_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS 활성화 (로그는 생성만 가능, 조희는 본인만)
ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own logs" ON public.interaction_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own logs" ON public.interaction_logs FOR SELECT USING (auth.uid() = user_id);

-- 4. 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
