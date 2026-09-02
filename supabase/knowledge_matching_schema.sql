-- ==============================================================================
-- 🏛️ 토보 AI [사전경험 & 지식축적 4대 코어 엔진] 통합 스키마
-- ==============================================================================

-- 1. [지식 축적 계층] 학습된 표현 매핑 및 의도 패턴 테이블
CREATE TABLE IF NOT EXISTS public.learned_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_expression TEXT NOT NULL,              -- e.g. '낼 3시데', '물려서', '침대에서 떨어짐'
  normalized_value TEXT NOT NULL,            -- e.g. '내일 15:00', 'trauma_bite: true', 'joint_trauma: true'
  field_id TEXT NOT NULL,                    -- e.g. 'preferred_schedule_time', 'grooming_trauma', 'joint_patella_status'
  domain_category TEXT DEFAULT 'universal',  -- 'universal', 'pet_grooming', 'clinic', 'pet_hotel', 'pet_dining'
  confidence NUMERIC(3, 2) DEFAULT 0.95,     -- 신뢰도 (0.00 ~ 1.00)
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. [매칭 스코어링 가중치 파라미터]
CREATE TABLE IF NOT EXISTS public.matching_weight_configs (
  id TEXT PRIMARY KEY,                       -- e.g. 'DEFAULT_WEIGHT_V1'
  location_weight NUMERIC(3, 2) DEFAULT 0.30,-- 지역/거리 가중치 (30%)
  budget_weight NUMERIC(3, 2) DEFAULT 0.25,  -- 예산 부합도 (25%)
  safety_care_weight NUMERIC(3, 2) DEFAULT 0.25, -- 노령견/1인케어/안전 (25%)
  urgency_weight NUMERIC(3, 2) DEFAULT 0.20, -- 즉시예약/긴급도 (20%)
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. [오류 유형 분류 체계 & 시뮬레이션 로그 확장]
ALTER TABLE public.simulation_logs
ADD COLUMN IF NOT EXISTS error_type TEXT CHECK (error_type IN ('NONE', 'MISSING_SLOT', 'HALLUCINATION', 'MISMATCH', 'OVER_VERIFICATION', 'LATENCY_INEFFICIENCY')),
ADD COLUMN IF NOT EXISTS candidate_shops_ranked JSONB DEFAULT '[]'::jsonb, -- 매칭 스코어링으로 산출된 후보 매장 순위표
ADD COLUMN IF NOT EXISTS confidence_branch TEXT; -- 'DIRECT_PROCEED' | 'CONFIRMATION_CHECK' | 'REQUERY_FALLBACK'
