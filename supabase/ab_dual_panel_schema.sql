-- ==============================================================================
-- 🏛️ 토보 AI [A/B 듀얼 심사단 & 상급 앙상블 전수 보존] 스키마 확장
-- ==============================================================================

ALTER TABLE public.simulation_logs
ADD COLUMN IF NOT EXISTS panel_a_scores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS panel_a_feedback JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS panel_b_scores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS panel_b_feedback JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ensemble_verdict TEXT;
