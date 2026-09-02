const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { structureUserIntent } = require('./src/modules/tobo/engine/intent-structuring-engine.ts');
const { prepareLeadMaterial } = require('./src/modules/tobo/engine/lead-material-orchestrator.ts');
const { generateEnforcedAIContent } = require('./src/utils/ai-core.ts');

async function executeStep(message, history, step) {
  const currentStep = Math.max(step, (history || []).length + 1);
  const structured = structureUserIntent(message);

  const leadCard = (structured.detectedDomain || currentStep === 1)
    ? prepareLeadMaterial(structured.detectedDomain, structured.intentType, currentStep, structured.unmetDetail)
    : null;

  if (structured.detectedDomain === 'custom_unmet') {
    return {
      reply: '찾으시는 서비스가 목록에 없으셨군요! 🐶 혹시 어떤 종류의 서비스(예: 펫택시, 훈련소, 장례, 전문 돌봄 등)가 필요하신지 말씀해 주시면, 소중한 의견을 반영하여 서비스 오픈 시 가장 먼저 안내해 드릴까요?',
      card: null,
      step: currentStep + 1
    };
  }

  if (currentStep === 1 && structured.intentType === 'GENERAL_GREETING') {
    return {
      reply: '반갑습니다 보호자님! 🐶 소중한 아이와 함께할 최적의 매장을 찾아드릴게요. 혹시 어떤 서비스의 예약을 도와드릴까요?',
      card: leadCard,
      step: 2
    };
  }

  const formattedHistory = (history || [])
    .map((h) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`)
    .join('\n');

  const prompt = `당신은 부산 사하구 반려동물 맞춤 파인더 '토보(Tobo)'입니다. (모델: Gemma 31B Pro)
[대화 규칙]:
1. 100% 정중한 물음표(~해 드릴까요?, ~여쭤봐도 될까요?)로만 답변하세요.
2. 기계적인 첫인사("반갑습니다 보호자님")를 절대 반복하지 마세요.
3. 고객의 이전 대화 맥락과 질문에 맞추어 유연하고 자연스럽게 응대하세요.

[이전 대화 기록]:
${formattedHistory}

[고객의 현재 메시지]: "${message}"

토보의 자연스러운 1~2문장 물음표 답변:`;

  const raw = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
  const aiReply = raw.replace(/^["']|["']$/g, '').trim();

  return {
    reply: aiReply,
    card: leadCard,
    step: currentStep + 1
  };
}

async function testDialogueContinuity() {
  console.log('🚀 [Multi-Turn Continuity Verification] 실제 Gemma 31B 3턴 핑퐁 검증 시작...\n');

  let history = [];

  // Turn 1: "어떤 예약 가능해?"
  console.log('----------------------------------------------------------------');
  console.log('[Turn 1]');
  const m1 = '어떤 예약 가능해?';
  console.log('User:', m1);
  const r1 = await executeStep(m1, history, 1);
  console.log('Tobo:', r1.reply);
  console.log('Card:', r1.card ? r1.card.title : 'None');
  history.push({ role: 'user', content: m1 });
  history.push({ role: 'assistant', content: r1.reply });

  // Turn 2: "💡 찾는 서비스가 없어요 (기타)"
  console.log('\n----------------------------------------------------------------');
  console.log('[Turn 2]');
  const m2 = '💡 찾는 서비스가 없어요 (기타)';
  console.log('User:', m2);
  const r2 = await executeStep(m2, history, 2);
  console.log('Tobo:', r2.reply);
  console.log('Card:', r2.card ? r2.card.title : 'None');
  history.push({ role: 'user', content: m2 });
  history.push({ role: 'assistant', content: r2.reply });

  // Turn 3: "다른건 없어?"
  console.log('\n----------------------------------------------------------------');
  console.log('[Turn 3]');
  const m3 = '다른건 없어?';
  console.log('User:', m3);
  const r3 = await executeStep(m3, history, 3);
  console.log('Tobo (Gemma 31B Response):', r3.reply);
  console.log('Card:', r3.card ? r3.card.title : 'None');

  console.log('\n================================================================');
  if (r3.reply.includes('반갑습니다 보호자님') || r3.card?.title === '어떤 서비스의 예약을 도와드릴까요?') {
    console.error('❌ FAIL: 여전히 앵무새 루프에 갇혀 있음');
  } else {
    console.log('✅ PASS: 대화 맥락 기억 & 앵무새 루프 완전 탈출 성공!');
  }
  console.log('================================================================');
}

testDialogueContinuity();
