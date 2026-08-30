import { createClient } from '@supabase/supabase-js';
import { executeToboResponse } from './src/modules/tobo/engine/tobo-execution-engine';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const userId = "00000000-0000-0000-0000-000000000000"; // MUST be a valid account ID in DB for FK constraints
  const businessId = "00000000-0000-0000-0000-000000000000"; // MUST be a valid account ID in DB for FK constraints
  
  console.log("=========================================");
  console.log(" [1차 대화] 예약 확정 및 특이사항 메모리 저장 테스트");
  console.log("=========================================");
  // 대화 기록을 조작하여 예약 확정 단계로 직행하도록 함
  const mockHistory = [
    { role: 'user', content: '하단역 주변 강아지 미용실 예약할게. 내일 오후 2시로.' },
    { role: 'assistant', content: '알겠습니다. 원하시는 업체를 선택해주세요. (선택됨)' },
    // 강제로 이전 턴에서 비즈니스 아이디 등을 지정한 것처럼 꾸밈
    { role: 'user', content: `업체 선택: ${businessId}` }
  ];
  
  const msg1 = "내일 오후 2시 하단역 근처 애견미용실 예약할게. 우리 애 피부가 예민해서 저자극 샴푸로 부탁드려요.";
  
  console.log(`[1차 대화 - 예약 완료 및 저장]`);
  console.log(`사용자: "${msg1}"`);
  const res1 = await executeToboResponse(admin, msg1, [], 1, userId, businessId);
  console.log(`\n🤖 토보 응답 원문:\n${res1.reply}\n`);

  // Wait briefly for safety (even though await should be enough)
  await new Promise(r => setTimeout(r, 1000));

  console.log("=========================================");
  console.log(" [2차 대화] RAG 메모리 선제안 텍스트 반영 테스트");
  console.log("=========================================");
  
  const msg2 = "하단역 근처 미용 예약하고 싶어요";
  console.log(`[2차 대화 - 새 세션 접속]`);
  console.log(`사용자: "${msg2}"`);
  
  // No businessId context passed here initially! The bot should recall memories by user_id and 'tobo-global' or something?
  // Wait, the prompt says: "같은 user_id + 그 업체(business_id) 조합으로 과거 기억이 있는지 먼저 조회"
  // So they WANT the contextBusinessId to be passed in the 2nd conversation too!
  const res2 = await executeToboResponse(admin, msg2, [], 1, userId, businessId);
  
  console.log(`\n🤖 토보 응답 원문:\n${res2.reply}\n`);

  // Wait briefly for safety
  await new Promise(r => setTimeout(r, 1000));

  console.log("=========================================");
  console.log(" [3차 대화] 다른 카테고리(병원) 질문 시 분리 테스트");
  console.log("=========================================");
  
  const msg3 = "동물병원 진료 예약하고 싶어요";
  console.log(`[3차 대화 - 새 세션 접속 (병원)]`);
  console.log(`사용자: "${msg3}"`);
  
  const res3 = await executeToboResponse(admin, msg3, [], 1, userId, businessId);
  
  console.log(`\n🤖 토보 응답 원문:\n${res3.reply}\n`);
}
runTest();
