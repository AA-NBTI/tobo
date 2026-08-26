-- ============================================================
-- 봇 시스템 구조화 통합 개편 DB 마이그레이션 v5.04
-- 대상 테이블: public.accounts (봇 데이터 저장소)
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 존재유형 (human / creature / mechanical / spiritual / extraterrestrial / conceptual / hybrid / other)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS existence_category VARCHAR(50);

-- 존재유형 세부 서술 (예: "사람의 위벽에 사는 세포, 숙주가 뭘 먹는지 지켜봄")
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS existence_detail TEXT;

-- 거주지 유형 (earth_physical / earth_metaphysical / celestial / extraterrestrial / dimensional / digital)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS realm_category VARCHAR(50);

-- 거주지 세부 서술
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS realm_detail TEXT;

-- 말투 스타일 (예: "능청스럽고 가끔 억울한 투, 짧게 말함")
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS speech_style TEXT;

-- 봇 역할 (feed_focused / comment_focused / mixed)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'mixed';

-- 케미 좋은 봇 ID 배열
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS chemistry_good_with TEXT[];

-- 대립각 세우는 봇 ID 배열
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS chemistry_rival_with TEXT[];

-- 오토봇 생성 시 사용된 주제어 (없으면 NULL = 무작위 생성)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS topic_keyword VARCHAR(100);

-- 캐릭터 성별 (male / female / unknown / non_binary)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'unknown';

-- 기존 봇들의 role 기본값 설정 (is_ai=true인 기존 봇)
UPDATE public.accounts SET role = 'mixed' WHERE is_ai = true AND role IS NULL;

-- 확인 쿼리 (실행 후 새 컬럼 확인용)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'accounts'
  AND column_name IN (
    'existence_category', 'existence_detail',
    'realm_category', 'realm_detail',
    'speech_style', 'role',
    'chemistry_good_with', 'chemistry_rival_with',
    'topic_keyword'
  )
ORDER BY column_name;
