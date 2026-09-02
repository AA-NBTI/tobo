import { generateEnforcedAIContent } from '../../src/utils/ai-core.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local for DB connection and API keys
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// 6 Verticals
const VERTICALS = ['pet_grooming', 'clinic', 'pet_hotel', 'pet_dining', 'pet_pension', 'pet_taxi'];

// 10 Scenarios
const SCENARIOS = [
  '단순확정형 (모든 정보를 한 문장에 다 말함)',
  '순차응답형 (질문하듯 가볍게 하나만 말함)',
  '애매표현형 ("아무때나", "적당히", "가까운 곳" 등 모호하게 말함)',
  '잡담후전환형 (관련없는 얘기 하다가 갑자기 예약 얘기함)',
  '중도변심형 (시간을 말했다가 뒤에 바로 바꿈)',
  '특이사항포함형 (알러지, 노령견, 맹견 등 특이사항을 길게 말함)',
  '미지원업종형 (해당 업종과 비슷한데 묘하게 다른 요구를 함)',
  '복합조건형 (대형견, 예산, 날짜 등 조건을 3개 이상 한 번에 말함)',
  '긴급/감정격앙형 (응급상황이거나 조급하고 화가 난 말투)',
  '오타/비문형 ("낼", "3시데", "병원어디" 등 띄어쓰기 없고 오타가 많은 패턴)'
];

async function generateCase(vertical: string, scenario: string) {
  const prompt = `당신은 펫 서비스 예약 시뮬레이션 데이터를 생성하는 QA 봇입니다.
조건에 맞춰 고객의 발화(1턴)와 기대되는 카테고리를 JSON 형식으로 1건만 생성하세요. 
설명 없이 오직 순수 JSON(마크다운 \`\`\`json 도 금지)만 반환하세요.

[생성 조건]
- 대상 업종: ${vertical} (미용, 병원, 호텔, 식당, 펜션, 펫택시 중 하나)
- 시나리오 성격: ${scenario}

출력 스키마:
{
  "vertical": "${vertical}",
  "scenario_type": "${scenario.split(' ')[0]}",
  "message": "고객 발화 내용",
  "expected_category": "${vertical}"
}`;

  const res = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
  let cleanRes = res.trim();
  if (cleanRes.startsWith('\`\`\`json')) cleanRes = cleanRes.replace(/^\`\`\`json/, '');
  if (cleanRes.startsWith('\`\`\`')) cleanRes = cleanRes.replace(/^\`\`\`/, '');
  if (cleanRes.endsWith('\`\`\`')) cleanRes = cleanRes.replace(/\`\`\`$/, '');
  
  return JSON.parse(cleanRes.trim());
}

async function run() {
  console.log('🚀 Phase 2: Generating 60 Core QA Cases using Gemini Flash...');
  const cases: any[] = [];
  let count = 1;
  const total = VERTICALS.length * SCENARIOS.length;

  for (const v of VERTICALS) {
    for (const s of SCENARIOS) {
      console.log(`[${count}/${total}] Generating ${v} x ${s.split(' ')[0]} ...`);
      try {
        const c = await generateCase(v, s);
        cases.push({
          id: `CASE-QA-${count.toString().padStart(3, '0')}`,
          ...c
        });
      } catch (e: any) {
        console.error(`❌ Failed on ${v} x ${s}: ${e.message}`);
      }
      count++;
      // Sleep slightly to avoid rate limit
      await new Promise(res => setTimeout(res, 500));
    }
  }

  const outPath = path.join(__dirname, '60_core_cases.json');
  fs.writeFileSync(outPath, JSON.stringify(cases, null, 2), 'utf-8');
  console.log(`✅ Successfully generated ${cases.length} cases at ${outPath}`);
}

run().catch(console.error);
