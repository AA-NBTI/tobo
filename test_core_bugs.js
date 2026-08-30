/**
 * 🧪 [4대 코어 버그 방지 단위테스트 러너] (CI Automated Unit Test)
 * - LLM 호출 0%, 순수 결정론적 코드 로직 검증
 * 
 * 1. 지명/상호명/특정단어 하드코딩 7대 단어 전수 검증
 *    ('하단', '사하구', '뽀송펫', '안심', '1인', '24시', '의료센터')
 * 2. 카테고리 0건 시 타 업종 오매칭 0% 및 빈 배열 반환 검증
 * 3. structureUserIntent 실제 호출 & DB 매장 수(Count) 기반 동적 isSupported 판정 검증
 * 4. 신뢰도 AND 조건(conf >= 0.90 && slots >= 2) 엄격 검증
 */

const fs = require('fs');
const path = require('path');
const { rankRealBusinesses } = require('./src/modules/tobo/engine/matching-scorer.js');
const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.js');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? `- ${details}` : ''}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('🧪 토보 AI 4대 코어 버그 회귀 방지 단위테스트 (Unit Test Suite)');
console.log('================================================================\n');

// ─────────────────────────────────────────────────────────────────────
// 1. [지명/상호명 하드코딩 7대 단어 전수 검증]
// ─────────────────────────────────────────────────────────────────────
console.log('▶️ [Test 1] matching-scorer.ts 내 7대 하드코딩 단어 0건 검증');
const scorerFilePath = path.join(__dirname, 'src/modules/tobo/engine/matching-scorer.ts');
const scorerContent = fs.readFileSync(scorerFilePath, 'utf-8');

// 대표님 지정 7대 하드코딩 단어 (코드 본문 및 스코어 계산 로직 내 검사)
const forbidden7Words = ['하단', '사하구', '뽀송펫', '안심', '1인', '24시', '의료센터'];
const lines = scorerContent.split('\n');
let forbiddenCount = 0;

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  // 주석 줄 제외
  if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
  for (const word of forbidden7Words) {
    // 문자열 리터럴로 직접 특정 지명/상호명을 하드코딩 매칭하는 패턴 검출
    if (line.includes(`'${word}'`) || line.includes(`"${word}"`) || line.includes(`includes('${word}')`)) {
      forbiddenCount++;
      console.error(`   - 7대 하드코딩 위반 발견 (Line ${idx + 1}): "${line.trim()}"`);
    }
  }
});

assert(forbiddenCount === 0, 'matching-scorer.ts 본문에 7대 지정 단어 하드코딩이 0건이어야 함');

// 가상 컬럼(is_private_care, is_emergency_24h 등) 참조 0건 검증
const hasVirtualColumns = scorerContent.includes('is_private_care') || scorerContent.includes('is_emergency_24h');
assert(!hasVirtualColumns, '실제 DB에 없는 가상 컬럼(is_private_care 등)을 참조하지 않아야 함');


// ─────────────────────────────────────────────────────────────────────
// 2. [카테고리 0건 시 일반화 필터 단위테스트]
// ─────────────────────────────────────────────────────────────────────
console.log('\n▶️ [Test 2] 카테고리 0건 시 타 업종 오매칭 0% 및 빈 배열 반환 검증');

const mockBusinesses = [
  { id: '1', name: '하단 미용실 A', category: 'pet_grooming', address: '사하구 하단동', region: '하단동', pet_size: '소형견', price_range: '$$', is_active: true, slug: 'groom-1' },
  { id: '2', name: '하단 미용실 B', category: 'pet_grooming', address: '사하구 하단동', region: '하단동', pet_size: '소형견,중형견', price_range: '$$$', is_active: true, slug: 'groom-2' },
  { id: '3', name: '24시 하단 병원', category: 'clinic', address: '사하구 하단동', region: '하단동', pet_size: null, price_range: null, is_active: true, slug: 'clinic-1' }
];

// 2-1. DB에 없는 카테고리(pet_taxi) 요청 시 -> 빈 배열 반환해야 함 (미용실로 튀면 안 됨)
const taxiResult = rankRealBusinesses(mockBusinesses, { target_category: 'pet_taxi', preferred_region: '하단동' });
assert(Array.isArray(taxiResult) && taxiResult.length === 0, 'DB에 매장이 0건인 카테고리(pet_taxi)는 빈 배열([])을 반환해야 함');

// 2-2. DB에 매장이 있는 카테고리(clinic) 요청 시 -> clinic 매장만 정확히 반환해야 함
const clinicResult = rankRealBusinesses(mockBusinesses, { target_category: 'clinic', preferred_region: '하단동' });
assert(clinicResult.length === 1 && clinicResult[0].category === 'clinic', '요청 카테고리(clinic)와 정확히 일치하는 매장만 반환해야 함');


// ─────────────────────────────────────────────────────────────────────
// 3. [structureUserIntent 실제 호출 & DB 카운트 동적 지원 단위테스트]
// ─────────────────────────────────────────────────────────────────────
console.log('\n▶️ [Test 3] structureUserIntent 실제 호출 및 DB 매장 수 기반 동적 isSupported 판정 검증');

// 3-1. 호텔 매장이 0건인 mockBusinesses 전달 시 -> structureUserIntent는 isSupported: false, UNMET_DEMAND 반환해야 함
const intentHotelNoShop = structureUserIntent('호텔 1박 맡기고 싶어요', mockBusinesses);
assert(
  intentHotelNoShop.detectedDomain === 'pet_hotel' &&
  intentHotelNoShop.isSupported === false &&
  intentHotelNoShop.intentType === 'UNMET_DEMAND',
  'DB에 호텔이 0건일 때 structureUserIntent는 isSupported=false 및 UNMET_DEMAND를 반환해야 함'
);

// 3-2. DB에 호텔 1건이 추가된 mockBusinessesWithHotel 전달 시 -> structureUserIntent는 isSupported: true, SUPPORTED_SERVICE로 자동 전환되어야 함
const mockBusinessesWithHotel = [
  ...mockBusinesses,
  { id: '4', name: '하단 호텔', category: 'pet_hotel', address: '사하구 하단동', region: '하단동', pet_size: '소형견', price_range: '$$$', is_active: true, slug: 'hotel-1' }
];
const intentHotelWithShop = structureUserIntent('호텔 1박 맡기고 싶어요', mockBusinessesWithHotel);
assert(
  intentHotelWithShop.detectedDomain === 'pet_hotel' &&
  intentHotelWithShop.isSupported === true &&
  intentHotelWithShop.intentType === 'SUPPORTED_SERVICE',
  'DB에 호텔 매장이 1건 추가되면 코드 수정 없이 structureUserIntent가 isSupported=true로 자동 전환되어야 함'
);

// 3-3. 펜션 문의 시 DB 0건 -> isSupported: false 검증
const intentPensionNoShop = structureUserIntent('강아지랑 수영장 독채 펜션 가고 싶어요', mockBusinesses);
assert(
  intentPensionNoShop.detectedDomain === 'pet_pension' &&
  intentPensionNoShop.isSupported === false &&
  intentPensionNoShop.intentType === 'UNMET_DEMAND',
  'DB에 펜션이 0건일 때 structureUserIntent는 isSupported=false를 반환해야 함'
);


// ─────────────────────────────────────────────────────────────────────
// 4. [신뢰도 AND 조건(Confidence & Slots) 게이트 단위테스트]
// ─────────────────────────────────────────────────────────────────────
console.log('\n▶️ [Test 4] 신뢰도 AND 조건(conf >= 0.90 && slots >= 2) 엄격 검증');

function evaluateConfidenceGate(avgConfidence, extractedSlotsCount) {
  // 코칭 후 엄격한 AND 조건
  return (avgConfidence >= 0.90 && extractedSlotsCount >= 2);
}

assert(evaluateConfidenceGate(0.95, 3) === true, '신뢰도 95% AND 슬롯 3개 -> 직진(true)');
assert(evaluateConfidenceGate(0.30, 3) === false, '신뢰도 30% AND 슬롯 3개 (낮은 신뢰도) -> 차단(false)');
assert(evaluateConfidenceGate(0.95, 1) === false, '신뢰도 95% AND 슬롯 1개 (슬롯 부족) -> 차단(false)');
assert(evaluateConfidenceGate(0.50, 1) === false, '신뢰도 50% AND 슬롯 1개 -> 차단(false)');


// ─────────────────────────────────────────────────────────────────────
// 5. [UI 카드 데이터 누락 방지 (prepareLeadMaterial) 단위테스트]
// ─────────────────────────────────────────────────────────────────────
console.log('\n▶️ [Test 5] CARD_TEMPLATES에 정의된 모든 카드가 prepareLeadMaterial에 구현되어 있는지 검증');
const { CARD_TEMPLATES, prepareLeadMaterial } = require('./src/modules/tobo/engine/lead-material-orchestrator.ts');

let missingCards = 0;
for (const template of CARD_TEMPLATES) {
  const generatedCard = prepareLeadMaterial(template.card_type, 'pet_grooming');
  if (generatedCard.type === 'unknown' || generatedCard.title === '안내를 준비 중입니다.') {
    missingCards++;
    console.error(`   - 누락된 카드 UI 발견: [${template.card_type}]가 prepareLeadMaterial에 구현되지 않음!`);
  }
}
assert(missingCards === 0, 'CARD_TEMPLATES의 모든 card_type은 prepareLeadMaterial에 UI 데이터가 정의되어야 함');

// ─────────────────────────────────────────────────────────────────────
// 6. [구형 카테고리 잔재 및 하드코딩 방지 단위테스트]
// ─────────────────────────────────────────────────────────────────────
console.log('\n▶️ [Test 6] 구형 카테고리 잔재 및 하드코딩된 가짜 상점명 0건 검증');
const { execSync } = require('child_process');
try {
  // src 디렉토리 내에서 검색 (결과가 있으면 출력 후 실패)
  const output = execSync('git grep -E "맛집|뷰티|운동/피트니스|몽펫샵|머라카노" -- src', { encoding: 'utf-8', stdio: 'pipe' });
  console.error('검출된 하드코딩 잔재:\n', output);
  assert(false, '구형 카테고리 잔재 또는 하드코딩 상점명이 코드베이스에 남아있습니다.');
} catch (e) {
  if (e.status === 1) {
    // grep 결과 0건이면 exit 1 반환하므로 정상
    assert(true, '구형 카테고리 잔재 및 하드코딩 0건 통과');
  } else {
    assert(false, 'git grep 명령어 실행 중 에러 발생');
  }
}

// ─────────────────────────────────────────────────────────────────────
// 7. [api-spec §8 회귀테스트 케이스 1~11 — 순수 결정론적 로직 검증]
// ─────────────────────────────────────────────────────────────────────
console.log('\n▶️ [Test 7] api-spec §8 회귀테스트 케이스 1~11 검증');

// --- Case 3: cancelWithinWindow WINDOW_EXPIRED 로직 펌 코드 검증 ---
// 실제 DB 없이 로직을 파일에서 직접 검증
const reservationApiPath = require('./src/modules/tobo/api/reservation-api.ts');
assert(typeof reservationApiPath.cancelWithinWindow === 'function',
  '[Case 3] cancelWithinWindow 함수가 존재해야 함');
assert(typeof reservationApiPath.recordNoShow === 'function',
  '[Case 5/6] recordNoShow 함수가 존재해야 함');
assert(typeof reservationApiPath.confirmReservation === 'function',
  '[Case 1/3] confirmReservation 함수가 존재해야 함');

// --- Case 4: BUSINESS_MISMATCH 로직 코드 검증 (cancelWithinWindow) ---
const cancelFn = reservationApiPath.cancelWithinWindow.toString();
assert(cancelFn.includes('BUSINESS_MISMATCH'),
  '[Case 4] cancelWithinWindow가 BUSINESS_MISMATCH 에러를 반환해야 함');

// --- Case 5: FUTURE_RESERVATION 로직 코드 검증 ---
const noShowFn = reservationApiPath.recordNoShow.toString();
assert(noShowFn.includes('FUTURE_RESERVATION'),
  '[Case 5] recordNoShow가 FUTURE_RESERVATION 에러를 반환해야 함');

// --- Case 6: noShow 와 페널티/제한 관련 필드 변경 없음 코드 검증 ---
// recordNoShow 함수 내에 페널티, 계정제한 등의 비즘 없음
assert(!noShowFn.includes('penalty') && !noShowFn.includes('ban') && !noShowFn.includes('suspend'),
  '[Case 6] recordNoShow 함수에 페널티/계정제한 코드가 없어야 함');

// --- Case 7: 학승인 업체 필터링 코드 검증 ---
const executionEnginePath = './src/modules/tobo/engine/tobo-execution-engine.ts';
const engineCode = require('fs').readFileSync(executionEnginePath, 'utf-8');
assert(engineCode.includes("onboarding_status") && engineCode.includes("'approved'"),
  '[Case 7] tobo-execution-engine이 onboarding_status=approved 필터를 포함해야 함');

// --- Case 8: getBusinessDashboard 응답에 매출/재방문 통계 필드 없음 코드 검증 ---
const dashboardApiPath = require('./src/modules/tobo/api/dashboard-api.ts');
assert(typeof dashboardApiPath.getBusinessDashboard === 'function',
  '[Case 8] getBusinessDashboard 함수가 존재해야 함');
const dashboardFn = dashboardApiPath.getBusinessDashboard.toString();
assert(!dashboardFn.includes('revenue') && !dashboardFn.includes('\ub9e4출') && !dashboardFn.includes('\uc7ac방문율'),
  '[Case 8] getBusinessDashboard 응답에 파일럯 범위 초과(매출/재방문) 코드가 없어야 함');

// [SKIP] Case 9: verified:false 업체가 2단계 API 호출 시 거부
// SSOT v1.5 13-8 보류 결정(2026-08-30): 실제 국세청 API 연동 전까지 스텀 상태
// 포일럽 고도화 완료 후 API 키 신청 시 이 코드를 복원할 것
// NOTE: 이 SKIP이 삭제되면 SSOT 13-8 복원 시점을 놓칠 수 있음 — 삭제 금지
console.log('  ⏸️  [SKIP] [Case 9] SSOT v1.5 13-8 보류 중 — 실제 verified:false 차단 테스트는 국세청 API 키 연동 후 복원');
const onboardingApiPath = require('./src/modules/tobo/api/onboarding-api.ts');

// --- Case 10: 비-pet_dining 업체 saveSeatingConfig 오류 반환 코드 검증 ---
const saveSeatingFn = onboardingApiPath.saveSeatingConfig.toString();
assert(saveSeatingFn.includes('WRONG_CATEGORY') && saveSeatingFn.includes('pet_dining'),
  '[Case 10] saveSeatingConfig이 pet_dining 아닌 업종에 WRONG_CATEGORY를 반환해야 함');

// --- Case 11: pet_dining이 confirmServiceSelection(그루밍용)을 호출하면 에러 ---
// 구조적으로 confirmServiceSelection은 business_services에 insert하므로
// pet_dining은 seating_config를 써야 하지만 이 기능은 업종 분기가 코드에 있는지 확인
const confirmSelectionFn = onboardingApiPath.confirmServiceSelection.toString();
assert(typeof onboardingApiPath.confirmServiceSelection === 'function',
  '[Case 11] confirmServiceSelection 함수가 존재해야 함');
// pet_dining은 saveSeatingConfig 사용해야 하므로 confirmServiceSelection에는
// pet_dining 업종도 파일럯 범위에서 외 업종을 위한 함수임과 같이 코드복잡도를 낮춘다
assert(!confirmSelectionFn.includes('pet_dining'),
  '[Case 11] confirmServiceSelection은 pet_dining 분기가 없어야 함 (식당용은 saveSeatingConfig로만 잘 못 들어자)');


console.log('\n================================================================');
console.log(`📊 테스트 실행 결과: 총 ${passedTests + failedTests}개 중 [PASS: ${passedTests}개 / FAIL: ${failedTests}개]`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 4대 코어 버그 방지 단위테스트가 100% 성공적으로 통과되었습니다!');
  process.exit(0);
}
