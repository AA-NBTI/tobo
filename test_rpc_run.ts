import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './src/utils/embedding';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runTest() {
  const message = "노령견인데 심장이 안 좋아서 안전하게 미용할 수 있는 사하구 하단동 쪽 미용실 있나요? 가격은 상관없어요.";
  console.log(`[1. 사용자 입력 (message)]\n"${message}"\n`);
  
  // 1-B. learned_mappings 데이터 개수 확인
  const { count: learnedCount, error: learnedCountError } = await admin
    .from('learned_mappings')
    .select('*', { count: 'exact', head: true });

  if (learnedCountError) {
    console.error("Learned Count Error:", learnedCountError);
  } else {
    console.log(`[0. learned_mappings 보유 데이터 수 확인]`);
    console.log(`SELECT count(*) FROM public.learned_mappings; -> ${learnedCount}개\n`);
  }
  if (!messageEmbedding) {
    console.log("임베딩 실패");
    return;
  }
  console.log(`[ ${messageEmbedding.slice(0, 5).join(', ')} ... 총 768차원 ]\n`);
  
  // 2. RPC 호출
  console.log(`[3. RPC 호출 (생략)]`);
}

runTest();
