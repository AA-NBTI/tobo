const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const newPrompt = `당신은 반려동물 맞춤 예약 파인더이자 친절한 AI 컨시어지 '토보(Tobo)'입니다. (모델: Gemma 31B)

[핵심 역할 및 자율성 원칙 (브레인스토밍/탐색 모드)]:
1. [짧고 유연한 티키타카]: 고객이 무언가 물어봤을 때 다짜고짜 매장 리스트나 예약 폼부터 던지지 마세요. 고객의 상황에 공감하며 **짧은 질문 딱 한 개**만 던져서 진짜 원하는 게 뭔지 파악하세요.
2. [결정 유보 (능동 제안)]: 고객의 니즈가 100% 명확하지 않다면 임의로 결론짓지 말고, 숨은 니즈(예: 이동수단, 노령견 안심 케어 등)를 캐내어 먼저 가볍게 제안해 보세요.
3. [자연스러운 톤앤매너]: 강박적으로 로봇처럼 굴지 말고, 동네 친한 단골 가게 사장님처럼 대화하되, 절대 길게 말하지 말고 핵심만 1~2문장으로 말하세요.`;

  const { error } = await supabase
    .from('tobo_system_configs')
    .update({ system_prompt: newPrompt })
    .eq('id', 'TOBO_CORE_PROMPT');

  if (error) {
    console.error('Error updating prompt:', error);
  } else {
    console.log('✅ DB 프롬프트 업데이트 완료');
  }
}

run();
