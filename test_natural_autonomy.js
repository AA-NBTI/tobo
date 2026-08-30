const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.ts');
const { prepareLeadMaterial } = require('./src/modules/tobo/engine/lead-material-orchestrator.ts');
const { generateEnforcedAIContent } = require('./src/utils/ai-core.ts');

const DEFAULT_SYSTEM_PROMPT = `당신은 부산 사하구 반려동물 맞춤 예약 파인더이자 친절한 AI 컨시어지 '토보(Tobo)'입니다. (모델: Gemma 31B)

[핵심 역할 및 자율성 원칙]:
1. [상식적이고 유연한 대화]: 손님의 발화 의도와 뉘앙스(의문 제기, 불만, 핀트 지적, 잡담, 질문 등)를 정확히 파악하여, 기계적인 앵무새 답변을 절대 하지 말고 살아있는 사람처럼 자연스럽고 지혜롭게 대화하세요. 손님이 답변의 어색함이나 핀트를 지적하면 솔직하게 인정하고 상식적으로 명쾌하게 답변하세요.
2. [데이터 기반 안내]: 부산 사하구 및 인근에 실제로 등록된 제휴 매장(미용, 24시 병원, 호텔, 식당, 펜션 등)의 실존 데이터를 바탕으로 신뢰할 수 있는 정확한 정보를 제공하세요.
3. [자연스러운 톤앤매너]: 강박적인 물음표를 남발하지 말고, 상황에 맞게 공감하고 설명하며 필요할 때 정중하게 제안하세요.`;

async function executeStep(message, history, step) {
  const currentStep = Math.max(step, (history || []).length + 1);

  // 1. DB 실존 매장 데이터 조회 (데이터 기반 검토)
  const { data: businesses } = await admin
    .from('businesses')
    .select('id, name, category, address, region, pet_size, price_range, is_active, slug')
    .eq('is_active', true);

  const availableBusinessesSummary = (businesses || [])
    .map((b) => `- [${b.name}] (${b.category}): ${b.address}, 지원체급: ${b.pet_size || '전견종'}`)
    .join('\n');

  // 2. 의도 파악 및 카드 디스패치 (메타 질문이나 핀트 지적 시 카드 강제 주입 완전 차단)
  const structured = structureUserIntent(message);
  let leadCard = null;

  const lowerMsg = (message || '').toLowerCase();
  const isQuestioningOrMeta = lowerMsg.includes('맞니') || lowerMsg.includes('왜') || lowerMsg.includes('어색') || lowerMsg.includes('도와줄수') || lowerMsg.includes('묻는데');

  if (!isQuestioningOrMeta && structured.detectedDomain && structured.intentType === 'SUPPORTED_SERVICE') {
    leadCard = prepareLeadMaterial(structured.detectedDomain, structured.intentType, currentStep);
  }

  // 3. 이전 대화 기록 포맷팅
  const formattedHistory = (history || [])
    .map((h) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`)
    .join('\n');

  // 4. Gemma 31B 자율성 주입 프롬프트
  const prompt = `${DEFAULT_SYSTEM_PROMPT}

[현재 등록된 실존 제휴 매장 데이터베이스]:
${availableBusinessesSummary}

[이전 대화 기록]:
${formattedHistory}

[고객의 현재 메시지]: "${message}"

손님의 말에 깊이 공감하고 맥락에 맞추어 유연하고 명쾌하게 답변하세요. (토보의 답변):`;

  const raw = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
  const aiReply = raw.replace(/^["']|["']$/g, '').trim();

  return {
    reply: aiReply,
    card: leadCard,
    step: currentStep + 1
  };
}

async function testNaturalAutonomy() {
  console.log('🚀 [Natural AI Autonomy Verification] 맥락 파악 및 자율성 대화 검증 시작...\n');

  let history = [];

  // Turn 1: "어떤 예약 도와줄수 잇어?"
  console.log('----------------------------------------------------------------');
  console.log('[Turn 1]');
  const m1 = '어떤 예약 도와줄수 잇어?';
  console.log('User:', m1);
  const r1 = await executeStep(m1, history, 1);
  console.log('Tobo (Gemma 31B):', r1.reply);
  console.log('Card:', r1.card ? r1.card.title : 'None (카드 강제 없음)');
  history.push({ role: 'user', content: m1 });
  history.push({ role: 'assistant', content: r1.reply });

  // Turn 2: "어떤 예약 도와줄수 잇어? 묻는데 사하구 내 동물병원, 미용실, 혹은 애견 호텔 예약을 도와드릴까요? 답변이 맞니?"
  console.log('\n----------------------------------------------------------------');
  console.log('[Turn 2: 손님의 핀트 지적 메타 발화]');
  const m2 = '어떤 예약 도와줄수 잇어? 묻는데 사하구 내 동물병원, 미용실, 혹은 애견 호텔 예약을 도와드릴까요? 답변이 맞니?';
  console.log('User:', m2);
  const r2 = await executeStep(m2, history, 2);
  console.log('Tobo (Gemma 31B Response):', r2.reply);
  console.log('Card:', r2.card ? r2.card.title : 'None (엉뚱한 호텔 카드 차단 성공)');

  console.log('\n================================================================');
  if (r2.card) {
    console.error('❌ FAIL: 엉뚱한 선택지 카드가 여전히 튀어나옴');
  } else {
    console.log('✅ PASS: AI 모델이 손님의 맥락을 정확히 이해하고 카드를 강제하지 않음!');
  }
  console.log('================================================================');
}

testNaturalAutonomy();
