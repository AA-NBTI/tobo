import { executeToboResponse } from './src/modules/tobo/engine/tobo-execution-engine';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TEST_CASES_10 = [
  { id: 'TEST-01', category: 'pet_grooming', message: '다음주 토요일 오후 3시에 5kg 비숑 가위컷 예약할게요. 하단동 매장 맞죠?' },
  { id: 'TEST-02', category: 'clinic', message: '강아지가 방금 침대에서 떨어져서 다리를 못 딛고 낑낑대는데 지금 바로 진료 가능한 사하구 쪽 병원 있나요?' },
  { id: 'TEST-03', category: 'pet_grooming', message: '저희 애가 12살 노령견이고 피부도 빨갛고 슬개골이 안 좋은데 하단동 쪽에 안전하게 미용해 주는 곳 있을까요?' },
  { id: 'TEST-04', category: 'pet_hotel', message: '다음주 수요일부터 3박 4일 출장이라 강아지 호텔 맡겨야 하는데 24시간 직원 상주하는 곳 있나요?' },
  { id: 'TEST-05', category: 'pet_dining', message: '이번주 일요일 점심에 25kg 대형견 데리고 식사할 수 있는 테라스 식당이나 카페 있나요?' },
  { id: 'TEST-06', category: 'pet_grooming', message: '하단동 근처에서 강아지 기본 목욕이랑 발톱 정리 저렴하게 잘하는 댕댕이 미용실 있나요?' },
  { id: 'TEST-07', category: 'clinic', message: '강아지 기본 종합백신 예방접종이랑 건강검진 예약하고 싶은데 사하구 동물병원 추천해 주세요.' },
  { id: 'TEST-08', category: 'pet_pension', message: '강아지랑 같이 수영할 수 있는 독채 펜션이나 풀빌라 예약 가능한 곳 있나요?' },
  { id: 'TEST-09', category: 'pet_taxi', message: '병원 갈 때 대형견 태우고 갈 수 있는 펫택시 픽업 서비스 예약도 되나요?' },
  { id: 'TEST-10', category: 'general', message: '안녕하세요! 여기서 강아지 관련 예약 상담받을 수 있나요?' }
];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runSequential10Cases() {
  console.log('🚀 [E2E Live Tobo Engine Runner] 10개 핵심 케이스 E2E 테스트 시작 (벡터 매칭 적용)...\n');
  
  for (let i = 0; i < TEST_CASES_10.length; i++) {
    const c = TEST_CASES_10[i];
    console.log(`\n================================================================`);
    console.log(`[CASE ${i + 1}/10: ${c.id}] Expected Category: ${c.category}`);
    console.log(`User: "${c.message}"`);
    console.log(`----------------------------------------------------------------`);
    
    try {
      const start = Date.now();
      const response = await executeToboResponse(admin, c.message, []);
      const latency = Date.now() - start;
      
      console.log(`Tobo: ${response.reply}`);
      if (response.cards && response.cards.options && response.cards.options.length > 0) {
        console.log(`Cards: [${response.cards.type}] ${response.cards.options.map((o:any)=>o.label).join(', ')}`);
      }
      console.log(`Latency: ${latency}ms`);
    } catch (e: any) {
      console.error(`❌ [ERROR] Case ${c.id} Failed:`, e.message);
    }
  }
  console.log('\n✅ 모든 테스트 완료!');
}

runSequential10Cases();
