import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

// 스크립트 기반 샘플 성과 집계 시드
const sampleStats = [
  { type_code: 'T3A1M3P3', sample_size: 15, total_reactions: { bone_strike: 42, impact: 18, like: 30, funny: 25, sad: 2 } },
  { type_code: 'T1A3M2P1', sample_size: 8,  total_reactions: { bone_strike: 5,  impact: 10, like: 45, funny: 12, sad: 1 } },
]

const { error: err1 } = await sb.from('axis_combo_stats').upsert(sampleStats)
if (err1) {
  console.log('⚠️ axis_combo_stats 테이블 확인 필요:', err1.message)
} else {
  console.log('✅ axis_combo_stats 2개 시드 저장 성공!')
}
