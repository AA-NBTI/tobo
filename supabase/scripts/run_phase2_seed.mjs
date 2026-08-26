import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

// 1. situations 조회 테스트
const { data: sitData, error: sitErr } = await sb.from('situations').select('*')
if (sitErr) {
  console.log('⚠️ situations 테이블 없음, SQL 적용 필요:', sitErr.message)
} else {
  console.log(`✅ situations (${sitData.length}개) 이미 존재함`)
}

// 2. axis_behavior_fragments 조회 테스트
const { data: fragData, error: fragErr } = await sb.from('axis_behavior_fragments').select('*')
if (fragErr) {
  console.log('⚠️ axis_behavior_fragments 테이블 없음, SQL 적용 필요:', fragErr.message)
} else {
  console.log(`✅ axis_behavior_fragments (${fragData.length}개 행동 규칙) 등록 완료!`)
}
