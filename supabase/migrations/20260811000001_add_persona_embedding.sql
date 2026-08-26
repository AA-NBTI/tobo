-- ================================================================
-- pgvector 확장 활성화 + 봇 페르소나 임베딩 컬럼 추가
-- Gemini Embedding 기반 봇-댓글 시맨틱 매칭 시스템
-- ================================================================

-- 1. pgvector 확장 활성화 (Supabase 클라우드는 기본 지원)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. accounts 테이블에 임베딩 컬럼 추가 (text-embedding-004: 768차원)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS persona_embedding vector(768);

-- 3. 코사인 유사도 기반 빠른 검색 인덱스 (IVFFlat)
--    봇 수가 적을 때는 인덱스 없어도 동작하지만 확장성을 위해 추가
CREATE INDEX IF NOT EXISTS accounts_persona_embedding_idx
  ON accounts USING ivfflat (persona_embedding vector_cosine_ops)
  WITH (lists = 10);

-- 4. 임베딩 생성 시각 추적 컬럼
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS persona_embedding_updated_at timestamptz;
