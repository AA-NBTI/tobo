import { createClient } from '@supabase/supabase-js';
import { extractSlots } from './src/modules/tobo/engine/slot-extractor';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const message = "낼 3시데 노령견인데 심장이 안 좋아서 안전하게 미용할 수 있는 사하구 하단동 쪽 미용실 있나요? 가격은 상관없어요.";
  console.log(`[1. 사용자 입력 (message)]\n"${message}"\n`);
  
  // 1. Before Count
  const { count: beforeCount } = await admin
    .from('learned_mappings')
    .select('*', { count: 'exact', head: true });
  console.log(`[Before] learned_mappings count: ${beforeCount}`);

  // 2. Extract Slots
  console.log(`\n[2. extractSlots 호출 중...]`);
  const intentData = await extractSlots(message, [], admin);
  console.log("추출된 슬롯:", JSON.stringify(intentData.slots, null, 2));

  // 3. After Count
  const { count: afterCount } = await admin
    .from('learned_mappings')
    .select('*', { count: 'exact', head: true });
  console.log(`\n[After] learned_mappings count: ${afterCount}`);
  
  // 4. 저장된 데이터 확인
  if (afterCount && afterCount > 0) {
    const { data } = await admin.from('learned_mappings').select('*').order('created_at', { ascending: false }).limit(2);
    console.log("\n[최근 추가된 학습 데이터]");
    console.log(JSON.stringify(data, null, 2));
  }
}

runTest();
