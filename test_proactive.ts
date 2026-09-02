import { createClient } from '@supabase/supabase-js';
import { executeToboResponse } from './src/modules/tobo/engine/tobo-execution-engine';
import { extractSlots } from './src/modules/tobo/engine/slot-extractor';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const message = "강아지가 다리를 다친 것 같아서요. 미용하려는데 어떡하죠?";
  console.log(`[1. 사용자 입력 (message)]\n"${message}"\n`);
  
  // 1.5. Extract slots directly to print raw JSON
  const intent = await extractSlots(message, [], admin);
  console.log("[슬롯 추출기 Raw JSON 출력]");
  console.log(JSON.stringify(intent, null, 2));

  // Execute Tobo Turn
  console.log(`\n[2. executeToboResponse 호출 중...]`);
  const result = await executeToboResponse(admin, message, [], 1);
  
  console.log("=========================================");
  console.log("🤖 토보 응답 원문:");
  console.log(result.reply);
  console.log("=========================================");
}

runTest();
