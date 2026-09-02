-- ==============================================================================
-- 🏛️ 토보 AI 데이터 수율(Yield) 및 20대 잠재 슬롯 대조 전용 스키마 확장
-- ==============================================================================

-- 1. simulation_runs 테이블 컬럼 보강 (데이터 수율 % 및 4대 심사관 종합점수)
ALTER TABLE public.simulation_runs 
ADD COLUMN IF NOT EXISTS avg_data_yield NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS yield_score NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS strategy_score NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS manner_score NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS curation_score NUMERIC(5, 2) DEFAULT 0.0;

-- 2. simulation_logs 테이블 컬럼 보강 (20개 잠재 슬롯 vs 추출 슬롯 대조표 및 4대 심사관 개별 피드백)
ALTER TABLE public.simulation_logs
ADD COLUMN IF NOT EXISTS ground_truth_slots JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS captured_slots JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS missed_slots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_yield_rate NUMERIC(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS yield_feedback TEXT,
ADD COLUMN IF NOT EXISTS strategy_feedback TEXT,
ADD COLUMN IF NOT EXISTS manner_feedback TEXT,
ADD COLUMN IF NOT EXISTS curation_feedback TEXT;
