-- ================================================================
-- PHASE 4-3: 리뷰 시스템 & 예약 완료 후 AI 리뷰 요청 스키마
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- 1. 리뷰(reviews) 테이블 생성
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL DEFAULT 5,
  content text NOT NULL,
  ai_reply text, -- AI 점주의 자동 감사/응대 댓글
  created_at timestamptz DEFAULT now()
);

-- 2. reservations 테이블에 review_id 및 review_requested_at 컬럼 추가
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- 3. RLS 정책 설정
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reviews select" ON public.reviews;
DROP POLICY IF EXISTS "Public reviews insert" ON public.reviews;

CREATE POLICY "Public reviews select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public reviews insert" ON public.reviews FOR INSERT WITH CHECK (true);

GRANT ALL ON public.reviews TO authenticated, service_role, anon;
