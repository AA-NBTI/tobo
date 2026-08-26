import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
)

const rules = [
  { from_tier: 'trainee',  to_tier: 'active',   min_days_at_current_tier: 7,  min_reaction_score: 10.0, min_validation_pass_rate: 0.85, is_auto: false },
  { from_tier: 'active',   to_tier: 'featured', min_days_at_current_tier: 14, min_reaction_score: 50.0, min_validation_pass_rate: 0.95, is_auto: false },
  { from_tier: 'featured', to_tier: 'active',   min_days_at_current_tier: 30, min_reaction_score: 20.0, min_validation_pass_rate: 0.80, is_auto: false },
  { from_tier: 'active',   to_tier: 'trainee',  min_days_at_current_tier: 30, min_reaction_score: 5.0,  min_validation_pass_rate: 0.70, is_auto: false },
]

const { error: ruleErr } = await sb.from('tier_transition_rules').upsert(rules)
if (ruleErr) {
  console.error('❌ tier_transition_rules 시드 실패:', ruleErr.message)
} else {
  console.log('✅ tier_transition_rules 4개 승급/강등 규칙 시드 등록 성공!')
}

// tier 가중치 가상 추첨 시뮬레이션
const tiers = ['featured', 'featured', 'active', 'trainee']
const tierWeights = { featured: 5, active: 2, trainee: 1 }


const weightedPool = []

tiers.forEach(t => {
  const count = tierWeights[t] || 1
  for (let i = 0; i < count; i++) weightedPool.push(t)
})

console.log('✅ tier 가중치 추첨 풀 시뮬레이션 (featured:active:trainee):')
console.log(`   총 티켓 ${weightedPool.length}장: [${weightedPool.join(', ')}]`)
