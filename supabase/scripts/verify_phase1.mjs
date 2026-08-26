import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

// 1. trait_axes 조회 (stage_role 포함)
const { data: axes, error: axErr } = await sb
  .from('trait_axes')
  .select('axis_key, axis_group, label_ko, stage_role')
  .order('sort_order')

if (axErr) {
  console.error('trait_axes 조회 실패:', axErr.message)
} else {
  console.log(`✅ trait_axes (${axes.length}개):`)
  axes.forEach(a => console.log(`  [${a.axis_group}] ${a.axis_key}: ${a.label_ko} (stage_role: ${a.stage_role || 'none'})`))
}

// 2. accounts / posts world_id & 컬럼 확인
const { data: acc, error: accErr } = await sb
  .from('accounts')
  .select('axis_profile, type_code, world_id')
  .limit(1)

if (accErr) {
  console.error('❌ accounts 컬럼 없음:', accErr.message)
} else {
  console.log('✅ accounts.axis_profile / type_code / world_id 컬럼 존재 확인')
}

// 3. type-code 유틸 및 주도축(calculateDominantAxis) 단위 테스트
const { runTypeCodeTests, calculateDominantAxis } = await import('../../src/utils/type-code.ts')
const result = runTypeCodeTests()

// Dominant axis 결정론 검증
const domTest1 = calculateDominantAxis({ target: 9, affection: 5, mask: 5, pace: 5 })
const domTest2 = calculateDominantAxis({ target: 9, affection: 5, mask: 5, pace: 5 })

if (result.failed === 0 && domTest1.axis_key === 'target' && domTest1.axis_key === domTest2.axis_key) {
  console.log(`✅ type-code & calculateDominantAxis 단위 테스트: 통과 (주도축: ${domTest1.label})`)
} else {
  console.error('❌ 단위 테스트 실패:', result.errors)
}
