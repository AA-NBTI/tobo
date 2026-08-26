-- ================================================================
-- 봇 탑승(Human Bot Piloting) 시스템 컬럼 추가
-- ================================================================

-- 1. accounts 테이블에 소유자/조종자 매핑 및 탑승 상태 컬럼 추가
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_piloted BOOLEAN DEFAULT FALSE;

-- 2. 조종자 빠른 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS accounts_claimed_by_user_id_idx ON accounts(claimed_by_user_id);
