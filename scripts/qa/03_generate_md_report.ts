import { createClient } from '@supabase/supabase-js';
import { executeToboResponse } from '../../src/modules/tobo/engine/tobo-execution-engine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local for DB connection
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const inPath = path.join(__dirname, '60_core_cases.json');
  const cases = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  
  let passedCount = 0;
  let mdContent = `# 📊 토보 E2E 시뮬레이션 결과 리포트 (60건)\n\n`;
  mdContent += `> 본 리포트는 6가지 업종과 10가지 시나리오(비문, 변심 등)를 조합한 60건의 엣지 케이스를 실제 엔진(\`executeToboResponse\`)에 통과시킨 결과입니다.\n\n`;

  console.log('Generating Markdown Report...');

  for (const c of cases) {
    let toboResult;
    try {
      toboResult = await executeToboResponse(supabaseAdmin, c.message, [], 1, 'QA_SIMULATOR');
    } catch (e: any) {
      toboResult = { isUnmet: false, reply: `[Error] ${e.message}` };
    }

    let status = 'FAIL';
    let errorType = 'MISMATCH';

    if (c.expected_category === 'pet_taxi') {
      if (toboResult.isUnmet) { status = 'PASS'; errorType = 'NONE (정상 방어)'; } 
      else { errorType = 'HALLUCINATION (미지원 업종 응대)'; }
    } else {
      if (toboResult.isUnmet) { errorType = 'MISSING_SLOT (의도 파악 실패)'; } 
      else if (toboResult.card) { status = 'PASS'; errorType = 'NONE (정상 매칭)'; } 
      else { errorType = 'LATENCY_INEFFICIENCY (카드 없이 말만 함)'; }
    }

    if (status === 'PASS') passedCount++;

    const statusBadge = status === 'PASS' ? '✅ **PASS**' : '❌ **FAIL**';
    
    mdContent += `### [${c.id}] ${c.vertical} - ${c.scenario_type}\n`;
    mdContent += `- **평가:** ${statusBadge} (사유: ${errorType})\n`;
    mdContent += `- **고객:** "${c.message}"\n`;
    mdContent += `- **토보:** "${toboResult.reply}"\n`;
    if (toboResult.card) {
      mdContent += `- **제공된 카드:** \`${toboResult.card.type}\` - ${toboResult.card.title}\n`;
    }
    mdContent += `---\n\n`;

    await new Promise(res => setTimeout(res, 300));
  }

  mdContent = mdContent.replace('# 📊 토보 E2E 시뮬레이션 결과 리포트 (60건)\n\n', `# 📊 토보 E2E 시뮬레이션 결과 리포트 (PASS: ${passedCount} / 60)\n\n`);

  // Write directly to the artifacts directory so the user can see it!
  const reportPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\a81b752d-616f-45fa-b8d2-b8fe143823f5\\e2e_simulation_report.md';
  fs.writeFileSync(reportPath, mdContent, 'utf-8');
  console.log(`Report generated at ${reportPath}`);
}

run().catch(console.error);
