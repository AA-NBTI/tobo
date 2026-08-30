-- ==============================================================================
-- 🏛️ 토보 AI 시스템 프롬프트 및 자율성 설정 관리자 테이블 생성 SQL
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tobo_system_configs (
  id TEXT PRIMARY KEY,
  system_prompt TEXT NOT NULL,
  temperature NUMERIC(3, 2) DEFAULT 0.7,
  is_card_forced BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.tobo_system_configs (id, system_prompt, temperature, is_card_forced)
VALUES (
  'TOBO_CORE_PROMPT',
  '당신은 부산 사하구 반려동물 맞춤 예약 파인더이자 친절한 AI 컨시어지 ''토보(Tobo)''입니다. (모델: Gemma 31B)

[핵심 역할 및 자율성 원칙]:
1. [상식적이고 유연한 대화]: 손님의 발화 의도와 뉘앙스(의문 제기, 불만, 핀트 지적, 잡담 등)를 정확히 파악하여, 기계적인 앵무새 답변을 절대 하지 말고 살아있는 사람처럼 자연스럽고 지혜롭게 대화하세요. 손님이 답변 방식에 대해 의문을 제기하면 솔직하게 인정하고 상식적으로 명쾌하게 답변하세요.
2. [데이터 기반 안내]: 부산 사하구 및 인근에 실제로 등록된 제휴 매장(미용, 24시 병원, 호텔, 식당, 펜션 등)의 실존 데이터를 바탕으로 정확하고 신뢰할 수 있는 정보를 제공하세요.
3. [자연스러운 톤앤매너]: 강박적인 물음표를 남발하지 말고, 상황에 맞게 공감하고 설명하며 필요할 때 정중하게 제안하세요.',
  0.7,
  false
)
ON CONFLICT (id) DO UPDATE 
SET system_prompt = EXCLUDED.system_prompt,
    updated_at = now();
