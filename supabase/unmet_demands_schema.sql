-- ==============================================================================
-- 🏛️ 토보 AI [1단계 데이터 구조화 & 미지원 수요(Unmet Demand) 자산화] 스키마
-- ==============================================================================

-- 1. 미지원 잠재 수요 자산화 테이블 (펜션, 펫택시, 장례, 훈련 등)
CREATE TABLE IF NOT EXISTS public.unmet_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID,
  raw_message TEXT NOT NULL,
  detected_category TEXT NOT NULL,          -- e.g. 'pet_pension', 'pet_taxi', 'pet_training', 'pet_funeral'
  location_area TEXT,                       -- e.g. '부산 사하구 하단동'
  contact_info TEXT,                        -- 알림 희망 연락처/이메일
  notification_agreed BOOLEAN DEFAULT false,-- 신규 출시 알림 동의 여부
  status TEXT DEFAULT 'COLLECTED',          -- 'COLLECTED' -> 'REVIEWED' -> 'EXPANDED'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 동적 질문/선택 카드 라이브러리 (시뮬레이션으로 축적되는 카드 유니버스)
CREATE TABLE IF NOT EXISTS public.card_library (
  id TEXT PRIMARY KEY,                      -- e.g. 'ROOT_DOMAIN_DISCOVERY', 'UNMET_NOTIFY_CARD'
  title TEXT NOT NULL,
  category TEXT NOT NULL,                   -- 'universal', 'pet_grooming', 'clinic', 'hotel', 'unmet'
  options JSONB NOT NULL,                   -- [{ label: "...", value: "..." }]
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
