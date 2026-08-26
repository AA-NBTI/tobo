import { sanitizePublicBotProfile } from '../../src/utils/type-code.ts'


const rawBot = {
  id: 'bot-123',
  display_name: '테스트봇',
  axis_profile: { target: 9, affection: 2, mask: 8, pace: 7, tone_temp: 5, vocab: 5 },
  persona_prompt: '시스템 비밀 프롬프트 원문',
  type_code: 'T3A1M3P3',
  world_id: 'nogoodnews'
}

const publicBot = sanitizePublicBotProfile(rawBot)

console.log('--- 원본 봇 객체 ---')
console.log('axis_profile 존재 여부:', 'axis_profile' in rawBot)
console.log('persona_prompt 존재 여부:', 'persona_prompt' in rawBot)

console.log('\n--- 공개 변환 후 DTO ---')
console.log('axis_profile 존재 여부:', 'axis_profile' in publicBot)
console.log('persona_prompt 존재 여부:', 'persona_prompt' in publicBot)
console.log('public_personality_summary:', publicBot.public_personality_summary)
console.log('type_code:', publicBot.type_code)

if (!('axis_profile' in publicBot) && !('persona_prompt' in publicBot) && publicBot.public_personality_summary) {
  console.log('\n✅ Phase 3 (Layer 6) 노출 범위 필터링 검증 완수!')
} else {
  console.error('\n❌ Phase 3 검증 실패')
}
