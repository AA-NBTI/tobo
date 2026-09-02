const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.ts');
const { rankRealBusinesses } = require('./src/modules/tobo/engine/matching-scorer.ts');
const { generateEnforcedAIContent } = require('./src/utils/ai-core.ts');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runLiveTwoCases() {
  const { data: businesses } = await admin.from('businesses').select('id, name, category, address, region, pet_size, price_range, is_active, slug');

  // [Case 1: pet_grooming 문의]
  console.log('================================================================');
  console.log('[CASE 1] 실제 Gemma 31B 호출 - 애견미용 문의');
  const t1_start = new Date().toISOString();
  console.log('Timestamp Start:', t1_start);

  const req1_msg = '다음주 토요일 오후 3시에 5kg 비숑 가위컷 예약할게요. 하단동 매장 맞죠?';
  const intent1 = structureUserIntent(req1_msg);
  console.log('1. Intent Structuring:', intent1);

  const ranked1 = rankRealBusinesses(businesses, {
    target_category: intent1.detectedDomain || 'pet_grooming',
    preferred_region: '하단동',
    pet_size: '소형견',
    budget_level: '$$$'
  });
  const matchedShop1 = ranked1[0];
  console.log('2. Matched Business:', { id: matchedShop1.id, name: matchedShop1.name, category: matchedShop1.category, score: matchedShop1.match_score });

  const prompt1 = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${req1_msg}"라고 문의했습니다. 1순위 매칭된 ${matchedShop1.name}을 염두에 두고 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
  const res1_text = await generateEnforcedAIContent(prompt1, 'gemma-4-31b-it');
  const t1_end = new Date().toISOString();

  console.log('3. Gemma 31B Actual Response:', res1_text.trim());
  console.log('Timestamp End:', t1_end);

  // [Case 2: clinic 문의]
  console.log('\n================================================================');
  console.log('[CASE 2] 실제 Gemma 31B 호출 - 동물병원 응급 문의');
  const t2_start = new Date().toISOString();
  console.log('Timestamp Start:', t2_start);

  const req2_msg = '강아지가 방금 침대에서 떨어져서 다리를 못 딛고 낑낑대는데 지금 바로 진료 가능한 사하구 쪽 병원 있나요?';
  const intent2 = structureUserIntent(req2_msg);
  console.log('1. Intent Structuring:', intent2);

  const ranked2 = rankRealBusinesses(businesses, {
    target_category: intent2.detectedDomain || 'clinic',
    preferred_region: '하단동',
    pet_size: '소형견',
    budget_level: '$$'
  });
  const matchedShop2 = ranked2[0];
  console.log('2. Matched Business:', { id: matchedShop2.id, name: matchedShop2.name, category: matchedShop2.category, score: matchedShop2.match_score });

  const prompt2 = `당신은 부산 사하구 반려동물 취향 파인더 토보입니다. 고객이 "${req2_msg}"라고 문의했습니다. 1순위 매칭된 ${matchedShop2.name}을 염두에 두고 100% 정중한 물음표(~해 드릴까요?)로 1문장 답변하세요:`;
  const res2_text = await generateEnforcedAIContent(prompt2, 'gemma-4-31b-it');
  const t2_end = new Date().toISOString();

  console.log('3. Gemma 31B Actual Response:', res2_text.trim());
  console.log('Timestamp End:', t2_end);
  console.log('================================================================');
}

runLiveTwoCases();
