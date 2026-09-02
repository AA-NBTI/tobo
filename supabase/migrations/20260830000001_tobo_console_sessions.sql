-- ================================================================
-- PHASE 5: 토보 메인 콘솔 세션 및 대화 영구 보존 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- 1. 토보 전용 세션 테이블 생성
CREATE TABLE IF NOT EXISTS public.tobo_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  category text DEFAULT 'all', -- 선택했던 탭 카테고리 보존
  title text DEFAULT '새 대화', -- 대화 요약 제목 (추후 AI로 자동 생성 가능)
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 토보 전용 메시지 테이블 생성
CREATE TABLE IF NOT EXISTS public.tobo_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.tobo_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS (Row Level Security) 설정
ALTER TABLE public.tobo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tobo_messages ENABLE ROW LEVEL SECURITY;

-- 유저는 자신의 세션만 조회, 생성, 수정, 삭제 가능
CREATE POLICY "Users can manage their own tobo sessions" 
  ON public.tobo_sessions FOR ALL 
  USING (auth.uid() = user_id);

-- 유저는 자신의 세션에 속한 메시지만 조회, 생성 가능 (서브쿼리 이용)
CREATE POLICY "Users can manage their own tobo messages" 
  ON public.tobo_messages FOR ALL 
  USING (
    session_id IN (
      SELECT id FROM public.tobo_sessions WHERE user_id = auth.uid()
    )
  );

-- 4. 스키마 캐시 리로드
NOTIFY pgrst, 'reload schema';
