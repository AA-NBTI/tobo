/**
 * Phase 1 Layer 1 마이그레이션 실행 스크립트
 * 로컬 Supabase DB에 직접 SQL을 실행합니다.
 *
 * 실행: node supabase/scripts/run_phase1_migration.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// SQL 단계별 실행 (각 단계 독립 실행)
const steps = [
  {
    name: 'trait_axes 테이블 생성',
    sql: `
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
    `
  },
  {
    name: 'trait_axes 시드 데이터 — target',
    sql: `INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
      VALUES ('target', 'decision', '공격 대상', '상황/시스템 중심', '인물/집단 직접 지목', 10, 'always_private', 1)
      ON CONFLICT (axis_key) DO NOTHING;`
  },
  {
    name: 'trait_axes 시드 데이터 — affection',
    sql: `INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
      VALUES ('affection', 'decision', '애정 여부', '무관심·냉소', '팬심·애착', 10, 'always_private', 2)
      ON CONFLICT (axis_key) DO NOTHING;`
  },
  {
    name: 'trait_axes 시드 데이터 — mask',
    sql: `INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
      VALUES ('mask', 'decision', '표정/태도', '무표정·건조', '강한 감정 표출', 10, 'always_private', 3)
      ON CONFLICT (axis_key) DO NOTHING;`
  },
  {
    name: 'trait_axes 시드 데이터 — pace',
    sql: `INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
      VALUES ('pace', 'decision', '반응 속도감', '신중·지연 반응', '즉각·충동 반응', 10, 'always_private', 4)
      ON CONFLICT (axis_key) DO NOTHING;`
  },
  {
    name: 'trait_axes 시드 데이터 — tone_temp',
    sql: `INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
      VALUES ('tone_temp', 'rendering', '말투 온도', '공손·따뜻', '냉소·조롱·자극', 10, 'always_private', 5)
      ON CONFLICT (axis_key) DO NOTHING;`
  },
  {
    name: 'trait_axes 시드 데이터 — vocab',
    sql: `INSERT INTO public.trait_axes (axis_key, axis_group, label_ko, pole_low_label, pole_high_label, scale_max, visibility, sort_order)
      VALUES ('vocab', 'rendering', '어휘 스타일', '격식·표준어', '비속어·인터넷 은어', 10, 'always_private', 6)
      ON CONFLICT (axis_key) DO NOTHING;`
  },
  {
    name: 'accounts.axis_profile 컬럼 추가',
    sql: `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS axis_profile JSONB;`
  },
  {
    name: 'accounts.type_code 컬럼 추가',
    sql: `ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS type_code VARCHAR(10);`
  },
  {
    name: 'type_code 인덱스 생성',
    sql: `CREATE INDEX IF NOT EXISTS idx_accounts_type_code ON public.accounts (type_code) WHERE is_ai = true AND type_code IS NOT NULL;`
  },
]

async function run() {
  console.log('🚀 Phase 1 Layer 1 마이그레이션 시작\n')
  let passed = 0
  let failed = 0

  for (const step of steps) {
    try {
      // Supabase REST API의 rpc를 사용하거나 직접 HTTP로 실행
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: step.sql })
      })

      if (!res.ok) {
        // Supabase REST RPC 방식 실패 시 pg 직접 접속 방식 사용
        throw new Error(`HTTP ${res.status}`)
      }

      console.log(`  ✅ ${step.name}`)
      passed++
    } catch (err) {
      console.error(`  ❌ ${step.name}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n완료: ${passed}/${steps.length} 성공, ${failed} 실패`)

  // 검증: trait_axes 조회
  try {
    const { data, error } = await supabase.from('trait_axes').select('axis_key, axis_group, label_ko').order('sort_order')
    if (error) throw error
    console.log('\n📋 trait_axes 테이블 조회 결과:')
    data.forEach(row => console.log(`  [${row.axis_group}] ${row.axis_key}: ${row.label_ko}`))
  } catch (err) {
    console.error('\n⚠️  trait_axes 조회 실패 (테이블이 아직 없을 수 있음):', err.message)
  }

  // 검증: accounts 컬럼 확인
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('axis_profile, type_code')
      .limit(1)
    if (error) throw error
    console.log('\n✅ accounts.axis_profile, accounts.type_code 컬럼 존재 확인 완료')
  } catch (err) {
    console.error('\n⚠️  accounts 컬럼 확인 실패:', err.message)
  }
}

run().catch(console.error)
