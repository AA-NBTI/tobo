-- ==============================================================================
-- 🏛️ 토보 AI 7대 페르소나 자율 회귀 테스트 & 누적 아카이브 전용 스키마
-- ==============================================================================

-- 1. 회차별 테스트 실행 마스터 테이블 (Runs)
CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_number SERIAL, -- 회차 번호 (#1, #2, #3...)
    version_tag TEXT NOT NULL DEFAULT 'v9.04.0', -- 테스트 당시 엔진 버전
    total_score NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- 종합 평가 점수 (100점 만점)
    passed_count INT NOT NULL DEFAULT 0, -- 7개 중 통과 개수
    total_count INT NOT NULL DEFAULT 7,
    avg_turns NUMERIC(3, 1) NOT NULL DEFAULT 0.0, -- 평균 완료 턴 수
    hallucination_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.0, -- 환각 발생률 (0%)
    chief_summary TEXT, -- 총괄 관제 보고관(Chief Inspector) 최종 소견
    executed_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 회차별 7대 페르소나 상세 대화 및 감사 로그 테이블 (Logs)
CREATE TABLE IF NOT EXISTS public.simulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
    persona_id TEXT NOT NULL, -- P-01 ~ P-07
    persona_name TEXT NOT NULL, -- 원샷형, 단답형, 변덕형 등
    persona_model TEXT NOT NULL DEFAULT 'gemma-4-26b-a4b-it', -- 손님봇 모델
    tobo_model TEXT NOT NULL DEFAULT 'gemma-4-31b-it', -- 토보봇 모델
    turns_count INT NOT NULL DEFAULT 1,
    score NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    status TEXT NOT NULL DEFAULT 'PASS', -- PASS, WARNING, FAIL
    dialogue_history JSONB NOT NULL DEFAULT '[]'::jsonb, -- 1:1 대화 트랜스크립트
    extracted_slots JSONB NOT NULL DEFAULT '{}'::jsonb, -- 추출된 슬롯
    matched_shop_id TEXT, -- 매칭된 샵 slug 또는 id
    judge_31_feedback TEXT, -- 심판봇 (Gemini 3.1) 기계적 검증 소견
    auditor_35_feedback TEXT, -- 감사봇 (Gemini 3.5) 자연스러움/모순 소견
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to simulation_runs for authenticated and anon" 
ON public.simulation_runs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to simulation_logs for authenticated and anon" 
ON public.simulation_logs FOR ALL USING (true) WITH CHECK (true);
