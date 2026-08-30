const fs = require('fs')

// TypeScript 트랜스파일 없이 단순 테스트를 위한 흉내내기
const DEFAULT_CARD_TEMPLATES = [
  { card_type: 'service_select', required_slots: ['service_id'], priority: 10 },
  { card_type: 'date_picker', required_slots: ['date'], priority: 20 },
  { card_type: 'time_slot', required_slots: ['time_slot'], priority: 30 },
  { card_type: 'party_size', required_slots: ['party_size'], priority: 40 },
  { card_type: 'contact_confirm', required_slots: ['contact_confirm'], priority: 50 },
]

function determineNextCard(currentSlots) {
  const sortedTemplates = [...DEFAULT_CARD_TEMPLATES].sort((a, b) => a.priority - b.priority)
  for (const template of sortedTemplates) {
    const isMissing = template.required_slots.some(slotKey => {
      const val = currentSlots[slotKey]
      return val === undefined || val === null || val === ''
    })
    if (isMissing) return template.card_type
  }
  return 'reservation_confirm' // 모두 채워짐
}

console.log('--- 상태 머신 슬롯 체커 검증 ---')

const testCases = [
  {
    name: '1. 아예 아무것도 없는 초기 상태',
    slots: {},
    expected: 'service_select'
  },
  {
    name: '2. 서비스만 고른 상태',
    slots: { service_id: 'uuid-1234' },
    expected: 'date_picker'
  },
  {
    name: '3. 유저가 한방에 서비스와 날짜를 모두 말한 상태',
    slots: { service_id: 'uuid-1234', date: '2026-08-30' },
    expected: 'time_slot'
  },
  {
    name: '4. 시간과 인원수까지 전부 다 고른 상태',
    slots: { service_id: 'uuid-1234', date: '2026-08-30', time_slot: 'slot-5678', party_size: 2, contact_confirm: true },
    expected: 'reservation_confirm'
  }
]

let allPassed = true
for (const tc of testCases) {
  const result = determineNextCard(tc.slots)
  const pass = result === tc.expected
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${tc.name}`)
  console.log(`   - 현재 슬롯: ${JSON.stringify(tc.slots)}`)
  console.log(`   - 출력 카드: ${result} (예상: ${tc.expected})\n`)
  if (!pass) allPassed = false
}

if (allPassed) {
  console.log('✅ 모든 상태 머신 테스트 통과! AI가 아닌 100% 결정론적 코드 기반 라우팅 확인.')
} else {
  console.error('❌ 상태 머신 테스트 실패')
  process.exit(1)
}
