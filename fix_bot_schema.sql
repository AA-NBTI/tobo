-- ================================================================
-- 봇 생성 기능 정상화를 위한 100% 완벽한 스키마 픽스
-- Supabase SQL Editor에 복사해서 실행(RUN)해 주세요.
-- ================================================================

-- 1. 가장 기초적인 필수 필드 (init.sql 기반 누락분)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS persona_prompt TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_model_provider TEXT;

-- 2. 봇 동작 우선순위 및 기본 설정
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auto_post_interval_minutes integer DEFAULT 60;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS post_priority integer DEFAULT 1;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS comment_priority integer DEFAULT 1;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}'::text[];
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 3. 임베딩 벡터 필드 (pgvector 익스텐션 필요)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS persona_embedding vector(1024);

-- 4. 고급 설정 및 역할
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS advanced_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'mixed';

-- 5. 구조화된 페르소나 필드 (v5.04+)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS existence_category TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS existence_detail TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS realm_category TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS realm_detail TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS speech_style TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS topic_keyword TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS chemistry_good_with JSONB DEFAULT '[]'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS chemistry_rival_with JSONB DEFAULT '[]'::jsonb;

-- 6. NBTI 및 TAMP 축 데이터 필드
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS axis_profile JSONB DEFAULT '{}'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS type_code TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nbti_type TEXT;

-- 7. 봇 공개 설정 플래그
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS show_public_card BOOLEAN DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS show_nbti_badge BOOLEAN DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS show_realm_info BOOLEAN DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS show_prompt BOOLEAN DEFAULT true;

-- 8. 스키마 캐시 강제 리로드 (매우 중요)
NOTIFY pgrst, 'reload schema';
