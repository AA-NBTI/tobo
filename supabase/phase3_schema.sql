-- ================================================================
-- PHASE 3: 업체 관리 & 예약 고도화 스키마 추가
-- Supabase SQL Editor에서 실행하세요
-- ================================================================

-- 1. 업체(businesses) 테이블
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',  -- beauty, restaurant, clinic, fitness, etc.
  address text,
  phone text,
  logo_url text,
  cover_url text,
  operating_hours jsonb DEFAULT '{
    "mon": {"open": "09:00", "close": "18:00", "closed": false},
    "tue": {"open": "09:00", "close": "18:00", "closed": false},
    "wed": {"open": "09:00", "close": "18:00", "closed": false},
    "thu": {"open": "09:00", "close": "18:00", "closed": false},
    "fri": {"open": "09:00", "close": "18:00", "closed": false},
    "sat": {"open": "10:00", "close": "16:00", "closed": false},
    "sun": {"open": "00:00", "close": "00:00", "closed": true}
  }'::jsonb,
  is_active boolean DEFAULT true,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2. 서비스(services) 테이블
CREATE TABLE IF NOT EXISTS public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 60,
  price integer DEFAULT 0,
  max_party_size integer DEFAULT 1,
  is_active boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- 3. 타임슬롯(time_slots) 테이블 - 예약 가능 슬롯 관리
CREATE TABLE IF NOT EXISTS public.time_slots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  max_capacity integer DEFAULT 1,
  current_bookings integer DEFAULT 0,
  is_blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, service_id, slot_date, slot_time)
);

-- 4. reservations 테이블에 업체/서비스 연결 컬럼 추가
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_slot_id uuid REFERENCES public.time_slots(id) ON DELETE SET NULL;

-- 5. RLS 설정
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public businesses select" ON public.businesses;
DROP POLICY IF EXISTS "Public services select" ON public.services;
DROP POLICY IF EXISTS "Public time_slots select" ON public.time_slots;

CREATE POLICY "Public businesses select" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Public services select" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public time_slots select" ON public.time_slots FOR SELECT USING (true);

GRANT ALL ON public.businesses TO authenticated, service_role, anon;
GRANT ALL ON public.services TO authenticated, service_role, anon;
GRANT ALL ON public.time_slots TO authenticated, service_role, anon;
