const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.ts');
const { rankRealBusinesses } = require('./src/modules/tobo/engine/matching-scorer.ts');
const { generateEnforcedAIContent } = require('./src/utils/ai-core.ts');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RE_TEST_CASES = [
  { id: 'TEST-04', category: 'pet_hotel', label: '반려견 호텔/유치원', message: '다음주 수요일부터 3박 4일 출장이라 강아지 호텔 맡겨야 하는데 24시간 직원 상주하는 곳 있나요?', pet_size: '중형견', budget: '$$$' },
  { id: 'TEST-05', category: 'pet_dining', label: '반려견 동반 식당/카페', message: '이번주 일요일 점심에 25kg 대형견 데리고 식사할 수 있는 테라스 식당이나 카페 있나요?', pet_size: '대형견', budget: '$$' }
];

async function runReTest() {
  console.log('🚀 [TEST-04 & TEST-05 Re-Verification] 미지원 카테고리 0건 시 정상 미지원 안내 재검증 시작...\n');
  const { data: businesses } = await admin.from('businesses').select('id, name, category, address, region, pet_size, price_range, is_active, slug');

  for (let i = 0; i < RE_TEST_CASES.length; i++) {
    const c = RE_TEST_CASES[i];
    const t_start = new Date().toISOString();
    console.log(`================================================================`);
    console.log(`[CASE ${i + 1}/2: ${c.id}] Category: ${c.category}`);
    console.log(`Message: "${c.message}"`);
    console.log(`Timestamp Start: ${t_start}`);

    // 1. 의도 구조화
    const intent = structureUserIntent(c.message);
    console.log(`1. Intent Structuring:`, {
      type: intent.intentType,
      domain: intent.detectedDomain,
      keywords: intent.extractedKeywords
    });

    // 2. 매칭 스코어링 (0건 일반화 룰 적용)
    const ranked = rankRealBusinesses(businesses, {
      target_category: intent.detectedDomain || c.category,
      preferred_region: '하단동',
      pet_size: c.pet_size,
      budget_level: c.budget
    });

    const matchedShop = ranked[0] || null;
    const isNoCandidatesInDb = (ranked.length === 0);

    console.log(`2. DB 후보 검색 결과: ${ranked.length}건`);
    console.log(`Matched Business:`, matchedShop ? matchedShop.name : 'None (DB 제휴처 0건 - 미지원 분기)');

    // 3. 실제 Gemma 31B LLM 호출
    let prompt = '';
    if (isNoCandidatesInDb) {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 현재 하단동/사하구 지역에 ${c.label} 제휴 매장은 준비 중임을 솔직히 안내하고, 오픈 시 알림 신청을 도와드릴지 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    } else {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 1순위 매칭된 ${matchedShop.name}을 염두에 두고 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    }

    const aiResponse = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
    const t_end = new Date().toISOString();

    console.log(`3. Gemma 31B Response: "${aiResponse.trim()}"`);
    console.log(`Timestamp End: ${t_end}`);
  }
}

runReTest();
