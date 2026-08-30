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
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const inPath = path.join(__dirname, '60_core_cases.json');
  if (!fs.existsSync(inPath)) {
    console.error(`❌ Cannot find ${inPath}`);
    process.exit(1);
  }

  const cases = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  console.log(`🚀 Phase 3: Running E2E Simulation for ${cases.length} cases...`);

  const runId = 'run-' + Date.now();
  const logsChunk = [];
  let passedCount = 0;

  for (const c of cases) {
    console.log(`[TEST] ${c.id}: ${c.message}`);
    
    let toboResult;
    try {
      toboResult = await executeToboResponse(supabaseAdmin, c.message, [], 1, 'QA_SIMULATOR');
    } catch (e: any) {
      console.error(`  -> ❌ Engine Error: ${e.message}`);
      toboResult = { isUnmet: false, reply: 'ERROR' };
    }

    let status = 'FAIL';
    let errorType = 'MISMATCH';

    // Evaluation Logic
    if (c.expected_category === 'pet_taxi') {
      if (toboResult.isUnmet) {
        status = 'PASS';
        errorType = 'NONE';
      } else {
        errorType = 'HALLUCINATION'; // Should be unmet but bot tried to handle it
      }
    } else {
      if (toboResult.isUnmet) {
        errorType = 'MISSING_SLOT'; // Bot failed to extract the category
      } else if (toboResult.card) {
        status = 'PASS';
        errorType = 'NONE';
      } else {
        errorType = 'LATENCY_INEFFICIENCY'; // Bot didn't show a card, just talked
      }
    }

    if (status === 'PASS') passedCount++;

    logsChunk.push({
      id: crypto.randomUUID(),
      run_id: runId,
      persona_id: c.id,
      persona_name: `${c.vertical} - ${c.scenario_type}`,
      persona_model: 'gemini-1.5-flash',
      tobo_model: 'gemma-4-31b-it (Real Engine)',
      turns_count: 2,
      score: status === 'PASS' ? 100 : 0,
      status: status,
      error_type: errorType,
      dialogue_history: [
        { turn: 1, sender: 'customer', message: c.message },
        { turn: 1, sender: 'tobo', message: toboResult.reply }
      ],
      expected_category: c.expected_category
    });

    // Sleep to avoid rate limiting the LLM
    await new Promise(res => setTimeout(res, 500));
  }

  console.log(`\n======================================================`);
  console.log(`📊 E2E Simulation Result: PASS ${passedCount} / ${cases.length}`);
  console.log(`======================================================`);

  const { error } = await supabaseAdmin.from('simulation_logs').insert(logsChunk);
  if (error) {
    console.error('❌ Failed to save logs to DB:', error);
  } else {
    console.log('✅ Successfully saved E2E simulation logs to DB!');
  }
}

run().catch(console.error);
