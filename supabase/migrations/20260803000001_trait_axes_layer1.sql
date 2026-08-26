-- =====================================================
-- Phase 1 — Layer 1: 정체성 축 (Trait Axes)
-- 작성일: 2026-08-03
-- 완료 기준: axis_profile 입력 시 type_code가 규칙대로 생성
-- =====================================================

-- 1. 축 정의 테이블
-- axis_group: decision(판단축, type_code 반영) | rendering(표현축, 프롬프트 직접 삽입)
CREATE TABLE IF NOT EXISTS public.trait_axes (
  axis_key        VARCHAR(30) PRIMARY KEY,
  axis_group      TEXT NOT NULL CHECK (axis_group IN ('decision', 'rendering')),
  label_ko        TEXT NOT NULL,
  pole_low_label  TEXT,
  pole_high_label TEXT,
  scale_max       INT DEFAULT 10,
  visibility      TEXT NOT NULL DEFAULT 'always_private'
                  CHECK (visibility IN ('always_public', 'always_private', 'admin_toggle')),
  sort_order      INT DEFAULT 0
);

COMMENT ON TABLE public.trait_axes IS 'Layer 1 — 봇 성격 축 정의. decision=판단축(type_code 반영), rendering=표현축(프롬프트 직접 삽입)';
COMMENT ON COLUMN public.trait_axes.visibility IS 'Layer 6 — 공개 카드 노출 범위 제어';

-- 2. 시드 데이터 — 6개 축 정의
INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
VALUES
  -- 판단축 4개 (type_code T/A/M/P에 반영됨)
  ('target',    'decision',  '공격 대상',   '상황/시스템 중심',  '인물/집단 직접 지목', 10, 'always_private', 1),
  ('affection', 'decision',  '애정 여부',   '무관심·냉소',       '팬심·애착',           10, 'always_private', 2),
  ('mask',      'decision',  '표정/태도',   '무표정·건조',       '강한 감정 표출',       10, 'always_private', 3),
  ('pace',      'decision',  '반응 속도감', '신중·지연 반응',    '즉각·충동 반응',       10, 'always_private', 4),
  -- 표현축 2개 (프롬프트에 직접 삽입, type_code 미반영)
  ('tone_temp', 'rendering', '말투 온도',   '공손·따뜻',         '냉소·조롱·자극',       10, 'always_private', 5),
  ('vocab',     'rendering', '어휘 스타일', '격식·표준어',       '비속어·인터넷 은어',   10, 'always_private', 6)
ON CONFLICT (axis_key) DO NOTHING;

-- 3. accounts 테이블에 axis_profile, type_code 컬럼 추가
-- axis_profile: 6개 축 연속값 JSONB (기존 advanced_settings.axisXxx 미러)
-- type_code:    판단축 4개 양자화 결과 (예: 'T2A3M1P3')
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS axis_profile JSONB,
  ADD COLUMN IF NOT EXISTS type_code    VARCHAR(10);

COMMENT ON COLUMN public.accounts.axis_profile IS 'Layer 1 — 6개 축 연속값. 예: {"target":3,"affection":6,"mask":5,"pace":8,"tone_temp":5,"vocab":5}. always_private.';
COMMENT ON COLUMN public.accounts.type_code IS 'Layer 1 — 판단축 4개 양자화 코드. 예: T2A3M1P3. 유사봇 검색·fork에 사용.';

-- 4. RLS — axis_profile/type_code는 service_role만 쓰기 가능
--    (읽기 RLS는 accounts 테이블 기존 정책 그대로 유지하되,
--     공개 API 응답 필터링은 Layer 6 Phase 3에서 코드 레벨로 처리)
-- 기존 accounts RLS 정책에는 SELECT USING (true)가 있으므로
-- 별도 정책 추가 없이 Layer 6에서 응답 필터링으로 처리함.

-- 5. 인덱스 — type_code 유사봇 검색용
CREATE INDEX IF NOT EXISTS idx_accounts_type_code ON public.accounts (type_code)
  WHERE is_ai = true AND type_code IS NOT NULL;

-- 6. 권한 부여 및 RLS 설정
GRANT ALL ON public.trait_axes TO postgres, anon, authenticated, service_role;
ALTER TABLE public.trait_axes ENABLE ROW LEVEL SECURITY;
CREATE POLICY trait_axes_select ON public.trait_axes FOR SELECT USING (true);
