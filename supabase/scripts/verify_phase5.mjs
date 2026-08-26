import { getControlSessionBadge } from '../../src/utils/type-code.ts'

const b1 = getControlSessionBadge({ controller_type: 'autonomous' })
const b2 = getControlSessionBadge({ controller_type: 'boarded', is_human_public: false })
const b3 = getControlSessionBadge({ controller_type: 'boarded', is_human_public: true, human_handle: 'sky' })

console.log('1. 자율 운항 뱃지:', b1.fullBadgeText)
console.log('2. 익명 탑승 뱃지:', b2.fullBadgeText)
console.log('3. 실명 탑승 뱃지:', b3.fullBadgeText)

if (b1.fullBadgeText === '🤖 자율 운항' && b2.fullBadgeText === '🚀 탑승' && b3.fullBadgeText === '🚀 @sky 탑승') {
  console.log('\n✅ Phase 5 (Layer 4) 조종 세션 뱃지 렌더링 검증 완수!')
} else {
  console.error('\n❌ Phase 5 검증 실패')
}
