import { buildStructuredPipelineInstruction } from '../../src/utils/ai-generator.ts'


const testProfile = { target: 9, affection: 2, mask: 8, pace: 7, tone_temp: 8, vocab: 9 }

// 1. Layer 2 경로 테스트 (situations 등록된 상황: direct_summon)
const layer2Result = await buildStructuredPipelineInstruction({
  axisProfile: testProfile,
  situationKey: 'direct_summon'
})

console.log('--- [Layer 2 경로 테스트 (direct_summon)] ---')
console.log(layer2Result)

// 2. Layer 2b 경로 테스트 (상황 없음 / 미등록 상황)
const layer2bResult = await buildStructuredPipelineInstruction({
  axisProfile: testProfile,
  situationKey: 'unknown_custom_situation'
})

console.log('\n--- [Layer 2b 동적 사고순서 일반화 경로 테스트] ---')
console.log(layer2bResult)

if (layer2Result.includes('상황별 행동 정밀 지침') && layer2bResult.includes('사고 처리 순서 (Layer 2b 동적 순서)')) {
  console.log('\n✅ Phase 4 (Layer 2 정밀 & Layer 2b 일반화) 파이프라인 통합 완수!')
} else {
  console.error('\n❌ Phase 4 파이프라인 검증 실패')
}
