const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.ts');
const { rankRealBusinesses } = require('./src/modules/tobo/engine/matching-scorer.ts');
const { generateEnforcedAIContent } = require('./src/utils/ai-core.ts');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EXPANDED_TEST_CASES = [
  // 1. [호텔] DB에 신규 등록된 '하단 뽀송펫 프리미엄 호텔앤유치원' 자동 매칭 검증
  { id: 'EXP-01', category: 'pet_hotel', label: '호텔', message: '다음주 수요일부터 3박 4일 출장이라 강아지 호텔 맡겨야 하는데 하단동 쪽에 24시간 관리사 있는 호텔 있나요?', pet_size: '중형견', budget: '$$$' },
  // 2. [식당] DB에 신규 등록된 '을숙도 리버뷰 테라스 펫다이닝' 자동 매칭 검증
  { id: 'EXP-02', category: 'pet_dining', label: '식당', message: '이번주 일요일 점심에 25kg 대형견 데리고 식사할 수 있는 테라스 식당이나 카페 있나요?', pet_size: '대형견', budget: '$$' },
  // 3. [펜션] DB에 신규 등록된 '기장 오션뷰 독채 애견 풀빌라' 자동 매칭 검증
  { id: 'EXP-03', category: 'pet_pension', label: '펜션', message: '강아지랑 같이 수영할 수 있는 독채 펜션이나 풀빌라 예약 가능한 곳 있나요?', pet_size: '대형견', budget: '$$$' },
  // 4. [펫택시] 여전히 DB에 0건인 카테고리 ➔ 정상 미지원 오픈알림 분기 검증
  { id: 'EXP-04', category: 'pet_taxi', label: '펫택시', message: '병원 갈 때 대형견 태우고 갈 수 있는 펫택시 픽업 서비스 예약도 되나요?', pet_size: '대형견', budget: '$$' }
];

async function runExpandedRealVerification() {
  console.log('🚀 [New Domains Live Test] 신규 업종(호텔, 식당, 펜션) 실제 DB 매칭 및 Gemma 31B 호출 시작...\n');
  const { data: businesses } = await admin.from('businesses').select('id, name, category, address, region, pet_size, price_range, is_active, slug');

  for (let i = 0; i < EXPANDED_TEST_CASES.length; i++) {
    const c = EXPANDED_TEST_CASES[i];
    const t_start = new Date().toISOString();
    console.log(`================================================================`);
    console.log(`[CASE ${i + 1}/4: ${c.id}] Category: ${c.category}`);
    console.log(`Message: "${c.message}"`);
    console.log(`Timestamp Start: ${t_start}`);

    // 1. 의도 구조화
    const intent = structureUserIntent(c.message);
    const targetDomain = intent.detectedDomain || c.category;

    // 2. DB 실시간 매칭 (DB에 데이터가 있으면 자동 매칭, 0건이면 자동 미지원)
    const ranked = rankRealBusinesses(businesses, {
      target_category: targetDomain,
      preferred_region: '하단동',
      pet_size: c.pet_size,
      budget_level: c.budget
    });

    const matchedShop = ranked[0] || null;
    const isSupportedInDb = (ranked.length > 0);

    console.log(`1. DB 일치 매장 수: ${ranked.length}건`);
    console.log(`2. Matched Business:`, matchedShop ? `${matchedShop.name} (Score: ${matchedShop.match_score}점)` : 'None (DB 제휴처 0건 - 미지원 알림 분기)');

    // 3. 실제 Gemma 31B LLM 호출
    let prompt = '';
    if (!isSupportedInDb) {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 현재 해당 서비스 제휴 매장은 열심히 준비 중임을 안내하고, 서비스 오픈 시 알림 신청을 도와드릴지 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    } else {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 1순위 매칭된 ${matchedShop.name}을 염두에 두고 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    }

    const aiResponse = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
    const t_end = new Date().toISOString();

    console.log(`3. Gemma 31B Response: "${aiResponse.trim()}"`);
    console.log(`Timestamp End: ${t_end}`);
  }
}

runExpandedRealVerification();
