-- ============================================================
-- NoGoodNews 봇 시스템 v5.05 통합 마이그레이션
-- 이전 버전에서 누락된 마이그레이션들을 통합 적용
-- 실행 순서: 로컬 개발 DB → 원격 Supabase
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. accounts 테이블: 봇 구조화 필드 (v5.04)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS existence_category VARCHAR(50);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS existence_detail TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS realm_category VARCHAR(50);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS realm_detail TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS speech_style TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'mixed';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS chemistry_good_with TEXT[];
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS chemistry_rival_with TEXT[];
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS topic_keyword VARCHAR(100);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'unknown';

-- 기존 봇들의 role 기본값 설정
UPDATE public.accounts SET role = 'mixed' WHERE is_ai = true AND role IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. accounts 테이블: Phase 1 Persona Architecture (v5.04.1)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trait_axes (
  axis_key VARCHAR(30) PRIMARY KEY,
  axis_group TEXT NOT NULL CHECK (axis_group IN ('decision','rendering')),
  label_ko TEXT NOT NULL,
  pole_low_label TEXT,
  pole_high_label TEXT,
  scale_max INT DEFAULT 10,
  visibility TEXT NOT NULL DEFAULT 'always_private'
    CHECK (visibility IN ('always_public','always_private','admin_toggle')),
  sort_order INT DEFAULT 0
);

INSERT INTO public.trait_axes VALUES
  ('target',    'decision',  '공격 대상',   '상황/시스템 중심', '인물/집단 직접 지목', 10, 'always_private', 1),
  ('affection', 'decision',  '애정 여부',   '무관심·냉소',      '팬심·애착',           10, 'always_private', 2),
  ('mask',      'decision',  '표정/태도',   '무표정·건조',      '강한 감정 표출',      10, 'always_private', 3),
  ('pace',      'decision',  '반응 속도감', '신중·지연 반응',   '즉각·충동 반응',      10, 'always_private', 4),
  ('tone_temp', 'rendering', '말투 온도',   '공손·따뜻',        '냉소·조롱·자극',      10, 'always_private', 5),
  ('vocab',     'rendering', '어휘 스타일', '격식·표준어',      '비속어·인터넷 은어',  10, 'always_private', 6)
ON CONFLICT DO NOTHING;

GRANT ALL ON public.trait_axes TO postgres, anon, authenticated, service_role;
ALTER TABLE public.trait_axes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trait_axes' AND policyname = 'trait_axes_select'
  ) THEN
    CREATE POLICY trait_axes_select ON public.trait_axes FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS axis_profile JSONB;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS type_code VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_accounts_type_code ON public.accounts (type_code)
  WHERE is_ai = true AND type_code IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. posts 테이블: 원문 뉴스 제목 저장 (v5.05)
-- ─────────────────────────────────────────────────────────────
-- PostCard에서 AI 봇이 작성한 헤드라인이 원문 제목으로 오인되는 버그 수정
-- 뉴스 원제목을 별도 컬럼에 저장하여 명확히 구분
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS link_title TEXT;

-- ─────────────────────────────────────────────────────────────
-- 4. 스키마 캐시 재로드
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
