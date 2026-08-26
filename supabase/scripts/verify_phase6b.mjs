import { evaluateNbtiConsistency } from '../../src/utils/type-code.ts'

// Case 1: 3글자 이상 동일 ('ENFP', 'ENFP', 'ENTP') ➔ Pass (11/12 = 91.7%)
const res1 = evaluateNbtiConsistency(['ENFP', 'ENFP', 'ENTP'])
console.log('1. ENFP/ENFP/ENTP 결과:', res1)

// Case 2: 75% 미만 불안정 결과 ('ENFP', 'ISTJ', 'ESTP') ➔ Fail
const res2 = evaluateNbtiConsistency(['ENFP', 'ISTJ', 'ESTP'])
console.log('2. ENFP/ISTJ/ESTP 결과:', res2)

if (res1.passed && !res2.passed) {
  console.log('\n✅ Phase 6b (Layer 9b) NBTI 자가검증 일관성 판정 검증 성공!')
} else {
  console.error('\n❌ Phase 6b 검증 실패')
}
