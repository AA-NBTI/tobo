-- ================================================================
-- AI 기반 예약 관리 앱 DB 스키마 (Vector DB & RAG 포함)
-- ================================================================

-- 1. pgvector 확장 및 UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. 계정 / 프로필 테이블 (사용자 및 AI 봇)
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name text NOT NULL,
  avatar_url text,
  is_ai boolean DEFAULT false,
  gender text DEFAULT 'unspecified',
  mbti text DEFAULT 'ENFP',
  persona_info text,
  speech_style text DEFAULT 'friendly',
  created_at timestamptz DEFAULT now()
);

-- 3. AI Vector 기억 DB (RAG 메모리)
CREATE TABLE IF NOT EXISTS bot_memories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

-- 4. RLS 및 인덱스 설정
ALTER TABLE bot_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bot_memories are viewable by everyone."
  ON bot_memories FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own memories with bots"
  ON bot_memories FOR INSERT
  WITH CHECK ( true );

CREATE INDEX IF NOT EXISTS bot_memories_embedding_idx
  ON bot_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- 5. Vector 코사인 유사도 RAG 검색 RPC 함수
CREATE OR REPLACE FUNCTION match_bot_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_bot_id uuid,
  p_user_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bot_memories.id,
    bot_memories.content,
    1 - (bot_memories.embedding <=> query_embedding) AS similarity
  FROM bot_memories
  WHERE bot_memories.bot_id = p_bot_id
    AND bot_memories.user_id = ANY(p_user_ids)
    AND 1 - (bot_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY bot_memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. 채팅방 및 메시지 테이블 (1:1 DM 및 단톡방)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text,
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 7. AI 예약 관리 전용 테이블 (Reservations)
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  bot_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  reservation_time timestamptz NOT NULL,
  party_size int DEFAULT 1,
  status text DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public chat_rooms select" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "Public chat_messages select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Public chat_messages insert" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public reservations select" ON reservations FOR SELECT USING (true);
CREATE POLICY "Public reservations insert" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public reservations update" ON reservations FOR UPDATE USING (true);

-- 권한 부여
GRANT ALL ON TABLE bot_memories TO authenticated, service_role, anon;
GRANT ALL ON TABLE accounts TO authenticated, service_role, anon;
GRANT ALL ON TABLE chat_rooms TO authenticated, service_role, anon;
GRANT ALL ON TABLE chat_participants TO authenticated, service_role, anon;
GRANT ALL ON TABLE chat_messages TO authenticated, service_role, anon;
GRANT ALL ON TABLE reservations TO authenticated, service_role, anon;

-- ================================================================
-- 8. 토보 미지원 수요 트래킹 테이블 (Unmet Demands)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tobo_unmet_demands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.tobo_sessions(id) ON DELETE SET NULL,
  keyword text NOT NULL,             -- 예: 펜션, 동물병원, 치킨 등
  category_guess text,               -- 숙박, 의료, 외식 등 추정 분류
  user_note text,                    -- 고객이 남긴 세부 희망 조건 (예: 경주, 다견 2마리 등)
  notified boolean DEFAULT false,    -- 추후 서비스 오픈 시 알림 발송 여부
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tobo_unmet_demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public tobo_unmet_demands select" ON public.tobo_unmet_demands;
DROP POLICY IF EXISTS "Public tobo_unmet_demands insert" ON public.tobo_unmet_demands;
CREATE POLICY "Public tobo_unmet_demands select" ON public.tobo_unmet_demands FOR SELECT USING (true);
CREATE POLICY "Public tobo_unmet_demands insert" ON public.tobo_unmet_demands FOR INSERT WITH CHECK (true);
GRANT ALL ON TABLE public.tobo_unmet_demands TO authenticated, service_role, anon;

