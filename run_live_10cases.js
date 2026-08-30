const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.ts');
const { rankRealBusinesses } = require('./src/modules/tobo/engine/matching-scorer.ts');
const { generateEnforcedAIContent } = require('./src/utils/ai-core.ts');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_CASES_10 = [
  // 1. pet_grooming (비숑 가위컷)
  { id: 'TEST-01', category: 'pet_grooming', message: '다음주 토요일 오후 3시에 5kg 비숑 가위컷 예약할게요. 하단동 매장 맞죠?', pet_size: '소형견', budget: '$$$' },
  // 2. clinic (야간 응급 외상)
  { id: 'TEST-02', category: 'clinic', message: '강아지가 방금 침대에서 떨어져서 다리를 못 딛고 낑낑대는데 지금 바로 진료 가능한 사하구 쪽 병원 있나요?', pet_size: '소형견', budget: '$$' },
  // 3. pet_grooming (노령견 안전 미용)
  { id: 'TEST-03', category: 'pet_grooming', message: '저희 애가 12살 노령견이고 피부도 빨갛고 슬개골이 안 좋은데 하단동 쪽에 안전하게 미용해 주는 곳 있을까요?', pet_size: '소형견', budget: '$$$' },
  // 4. pet_hotel (출장 3박 4일 돌봄)
  { id: 'TEST-04', category: 'pet_hotel', message: '다음주 수요일부터 3박 4일 출장이라 강아지 호텔 맡겨야 하는데 24시간 직원 상주하는 곳 있나요?', pet_size: '중형견', budget: '$$$' },
  // 5. pet_dining (대형견 식당 동반)
  { id: 'TEST-05', category: 'pet_dining', message: '이번주 일요일 점심에 25kg 대형견 데리고 식사할 수 있는 테라스 식당이나 카페 있나요?', pet_size: '대형견', budget: '$$' },
  // 6. pet_grooming (가성비 기본 목욕)
  { id: 'TEST-06', category: 'pet_grooming', message: '하단동 근처에서 강아지 기본 목욕이랑 발톱 정리 저렴하게 잘하는 댕댕이 미용실 있나요?', pet_size: '소형견', budget: '$' },
  // 7. clinic (정기 예방접종 및 건강검진)
  { id: 'TEST-07', category: 'clinic', message: '강아지 기본 종합백신 예방접종이랑 건강검진 예약하고 싶은데 사하구 동물병원 추천해 주세요.', pet_size: '소형견', budget: '$$' },
  // 8. unmet_demand (펜션/풀빌라 문의)
  { id: 'TEST-08', category: 'pet_pension', message: '강아지랑 같이 수영할 수 있는 독채 펜션이나 풀빌라 예약 가능한 곳 있나요?', pet_size: '중형견', budget: '$$$' },
  // 9. unmet_demand (펫택시 픽업 문의)
  { id: 'TEST-09', category: 'pet_taxi', message: '병원 갈 때 대형견 태우고 갈 수 있는 펫택시 픽업 서비스 예약도 되나요?', pet_size: '대형견', budget: '$$' },
  // 10. general_greeting (단순 첫인사 문의)
  { id: 'TEST-10', category: 'general', message: '안녕하세요! 여기서 강아지 관련 예약 상담받을 수 있나요?', pet_size: '소형견', budget: '$$' }
];

async function runSequential10Cases() {
  console.log('🚀 [Sequential Live LLM Runner] 실제 Gemma 31B 10건 순차 호출 검증 시작...\n');
  const { data: businesses } = await admin.from('businesses').select('id, name, category, address, region, pet_size, price_range, is_active, slug');

  const results = [];

  for (let i = 0; i < TEST_CASES_10.length; i++) {
    const c = TEST_CASES_10[i];
    const t_start = new Date().toISOString();
    console.log(`----------------------------------------------------------------`);
    console.log(`[CASE ${i + 1}/10: ${c.id}] Category: ${c.category}`);
    console.log(`Message: "${c.message}"`);
    console.log(`Timestamp Start: ${t_start}`);

    // 1. 의도 구조화
    const intent = structureUserIntent(c.message);
    console.log(`1. Intent Structuring:`, {
      type: intent.intentType,
      domain: intent.detectedDomain,
      keywords: intent.extractedKeywords
    });

    // 2. 매칭 스코어링
    let matchedShop = null;
    if (intent.isSupported && intent.detectedDomain) {
      const ranked = rankRealBusinesses(businesses, {
        target_category: intent.detectedDomain,
        preferred_region: '하단동',
        pet_size: c.pet_size,
        budget_level: c.budget
      });
      matchedShop = ranked[0] || null;
    }

    if (matchedShop && matchedShop.match_score > 0) {
      console.log(`2. Matched Business:`, {
        id: matchedShop.id,
        name: matchedShop.name,
        category: matchedShop.category,
        score: matchedShop.match_score
      });
    } else {
      console.log(`2. Matched Business: None (미지원/매칭매장없음 - 오매칭 0점 배제)`);
    }

    // 3. 실제 Gemma 31B LLM 호출
    let prompt = '';
    if (intent.intentType === 'UNMET_DEMAND') {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 현재 해당 서비스는 준비 중임을 친절히 안내하고, 서비스 오픈 시 알림 신청을 도와드릴지 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    } else if (matchedShop && matchedShop.match_score > 0) {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 1순위 매칭된 ${matchedShop.name}을 염두에 두고 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    } else {
      prompt = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${c.message}"라고 문의했습니다. 따뜻하게 환영하며 어떤 서비스(미용, 병원, 호텔 등)가 필요하신지 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
    }

    const aiResponse = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
    const t_end = new Date().toISOString();

    console.log(`3. Gemma 31B Response: "${aiResponse.trim()}"`);
    console.log(`Timestamp End: ${t_end}`);

    results.push({
      caseId: c.id,
      tStart: t_start,
      tEnd: t_end,
      inputMessage: c.message,
      extractedKeywords: intent.extractedKeywords,
      matchedBusinessId: matchedShop?.id || null,
      matchedBusinessName: matchedShop?.name || null,
      aiResponse: aiResponse.trim()
    });

    // 순차 실행 간격 (1초 대기)
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n================================================================');
  console.log('✅ [10건 실제 Gemma 31B 순차 실행 완결 요약 표]');
  console.log('================================================================');
  console.table(results.map(r => ({
    Case: r.caseId,
    Start: r.tStart.split('T')[1].replace('Z',''),
    End: r.tEnd.split('T')[1].replace('Z',''),
    MatchedShop: r.matchedBusinessName || '미지원/안내',
    Keywords: r.extractedKeywords.join(', ')
  })));
}

runSequential10Cases();
