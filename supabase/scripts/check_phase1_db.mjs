import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

// trait_axes 조회
const { data: axes, error: axErr } = await sb.from('trait_axes').select('*')
if (axErr) {
  console.error('❌ trait_axes 조회 실패:', axErr.message)
} else {
  console.log('✅ trait_axes (총 ' + axes.length + '개):')
  axes.forEach(a => console.log(' - ' + a.axis_key + ' | group: ' + a.axis_group + ' | stage_role: ' + (a.stage_role || 'NULL')))
}

// accounts / posts world_id 확인
const { data: acc, error: accErr } = await sb.from('accounts').select('id, world_id, axis_profile, type_code').limit(1)
if (accErr) {
  console.error('❌ accounts 조회 실패:', accErr.message)
} else {
  console.log('✅ accounts world_id 확인:', acc[0]?.world_id || 'NULL')
}
