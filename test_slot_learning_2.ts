import { createClient } from '@supabase/supabase-js';
import { extractSlots } from './src/modules/tobo/engine/slot-extractor';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const message = "낼 말고 모레 3시데 예약 가능한가여?";
  console.log(`[1. 사용자 입력 (message)]\n"${message}"\n`);
  
  // 1. Before Count for '3시데'
  const { data: beforeData } = await admin
    .from('learned_mappings')
    .select('*')
    .eq('raw_expression', '3시데')
    .single();
  console.log(`[Before] '3시데' usage_count: ${beforeData?.usage_count || 0}`);

  // 2. Extract Slots (This will print the prompt)
  console.log(`\n[2. extractSlots 호출 중...]`);
  const intentData = await extractSlots(message, [], admin);
  console.log("추출된 슬롯:", JSON.stringify(intentData.slots, null, 2));

  // 3. After Count for '3시데'
  const { data: afterData } = await admin
    .from('learned_mappings')
    .select('*')
    .eq('raw_expression', '3시데')
    .single();
  console.log(`\n[After] '3시데' usage_count: ${afterData?.usage_count || 0}`);
}

runTest();
