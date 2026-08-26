-- ============================================================
-- 일반형 (basic) NBTI 28문항 시드 마이그레이션
-- 데이터 출처: F:\projects\AA-BB\nbti_seed_112_final.sql (일반형 basic 전용)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nbti_questions (
  question_id VARCHAR(50) PRIMARY KEY,
  test_type   VARCHAR(20) NOT NULL DEFAULT 'basic',
  axis        VARCHAR(2) NOT NULL,
  polarity    INT NOT NULL,
  content     TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.nbti_questions TO postgres, anon, authenticated, service_role;
ALTER TABLE public.nbti_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nbti_questions' AND policyname = 'nbti_questions_select') THEN
    CREATE POLICY nbti_questions_select ON public.nbti_questions FOR SELECT USING (true);
  END IF;
END $$;

-- [일반형 basic 28개 문항 적재]
INSERT INTO public.nbti_questions (question_id, test_type, axis, polarity, content) VALUES
  ('GEN_EI_01', 'basic', 'EI',  1, '사람들과 어울리면 에너지가 생긴다'),
  ('GEN_EI_02', 'basic', 'EI', -1, '혼자 있어야 에너지가 충전된다'),
  ('GEN_EI_03', 'basic', 'EI',  1, '새로운 사람과 금방 친해진다'),
  ('GEN_EI_04', 'basic', 'EI', -1, '여럿이 놀고 나면 혼자 쉬어야 한다'),
  ('GEN_EI_05', 'basic', 'EI',  1, '말하면서 생각이 정리된다'),
  ('GEN_EI_06', 'basic', 'EI', -1, '말하기 전에 머릿속으로 먼저 정리한다'),
  ('GEN_EI_07', 'basic', 'EI',  1, '갑작스러운 모임도 즐겁게 참석한다'),

  ('GEN_SN_01', 'basic', 'SN', -1, '새로운 가능성을 상상하는 게 즐겁다'),
  ('GEN_SN_02', 'basic', 'SN',  1, '경험과 사실을 바탕으로 판단한다'),
  ('GEN_SN_03', 'basic', 'SN', -1, '사물 이면의 의미와 패턴에 관심이 간다'),
  ('GEN_SN_04', 'basic', 'SN',  1, '세부 지침이 있어야 일하기 편하다'),
  ('GEN_SN_05', 'basic', 'SN', -1, '비유적 표현을 자주 사용한다'),
  ('GEN_SN_06', 'basic', 'SN',  1, '지금 할 수 있는 것에 집중하는 편이다'),
  ('GEN_SN_07', 'basic', 'SN', -1, '직감이 자주 맞는 편이다'),

  ('GEN_TF_01', 'basic', 'TF',  1, '원칙을 위해 불편한 말도 할 수 있다'),
  ('GEN_TF_02', 'basic', 'TF', -1, '결정이 남의 감정에 미칠 영향이 신경 쓰인다'),
  ('GEN_TF_03', 'basic', 'TF',  1, '고민을 들으면 해결책을 찾게 된다'),
  ('GEN_TF_04', 'basic', 'TF', -1, '친구가 힘들면 공감부터 하는 편이다'),
  ('GEN_TF_05', 'basic', 'TF',  1, '팩트 기반 피드백을 선호한다'),
  ('GEN_TF_06', 'basic', 'TF', -1, '상대가 화나면 옳은 말도 나중에 한다'),
  ('GEN_TF_07', 'basic', 'TF',  1, '감정을 배제하고 객관적으로 판단하려 한다'),

  ('GEN_JP_01', 'basic', 'JP',  1, '일정을 미리 짜두어야 마음이 편하다'),
  ('GEN_JP_02', 'basic', 'JP', -1, '그날 기분에 맞춰 유연하게 움직인다'),
  ('GEN_JP_03', 'basic', 'JP',  1, '할 일 목록을 만들고 지워나가는 게 좋다'),
  ('GEN_JP_04', 'basic', 'JP', -1, '마감이 임박해야 집중이 잘 되는 편이다'),
  ('GEN_JP_05', 'basic', 'JP',  1, '정해진 체계대로 정리되어 있어야 한다'),
  ('GEN_JP_06', 'basic', 'JP', -1, '결정을 미루고 여지를 남겨두는 편이다'),
  ('GEN_JP_07', 'basic', 'JP',  1, '계획이 틀어지면 스트레스를 받는다')
ON CONFLICT (question_id) DO UPDATE SET
  content = EXCLUDED.content,
  axis = EXCLUDED.axis,
  polarity = EXCLUDED.polarity;

NOTIFY pgrst, 'reload schema';
