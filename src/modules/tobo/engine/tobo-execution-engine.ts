import { SupabaseClient } from '@supabase/supabase-js';
import { generateEnforcedAIContent } from '../../../utils/ai-core';
import { structureUserIntent, StructuredIntent } from './intent-structuring-engine';
import { prepareLeadMaterial, LeadQuestionCard } from './lead-material-orchestrator';
import { rankRealBusinesses } from './matching-scorer';

export interface ToboExecutionResult {
  reply: string;
  card?: LeadQuestionCard;
  isUnmet: boolean;
  unmetCategory?: string;
  step: number;
  recommendationList?: any[];
}

// System Prompt는 DB(tobo_system_configs)에서 동적으로 불러오며 (SSOT),
// DB 접근 실패 등 치명적 에러 시에만 아래 최소한의 가드레일 프롬프트를 Fallback으로 사용합니다. (지역명 절대 배제)
const FALLBACK_SAFE_PROMPT = `당신은 반려동물 맞춤 예약 파인더이자 친절한 AI 컨시어지 '토보(Tobo)'입니다. (모델: Gemma 31B)

[핵심 역할 및 자율성 원칙]:
1. [상식적이고 유연한 대화]: 손님의 발화 의도와 뉘앙스를 정확히 파악하여, 살아있는 사람처럼 자연스럽고 지혜롭게 대화하세요.
2. [데이터 기반 안내]: 사용자가 요청한 지역 및 인근에 실제로 등록된 실존 데이터를 바탕으로 신뢰할 수 있는 정확한 정보를 제공하세요. 목록에 없는 정보는 절대 지어내지 마세요(No Hallucination).
3. [자연스러운 톤앤매너]: 강박적인 물음표를 남발하지 말고, 상황에 맞게 공감하고 설명하며 필요할 때 정중하게 제안하세요.`;


/**
 * 🐶 [3단계] 토보 자율성 보장형 자연스러운 응대 엔진
 */
export async function executeToboResponse(
  supabaseAdmin: SupabaseClient,
  message: string,
  history: any[] = [],
  step: number = 1,
  userId?: string
): Promise<ToboExecutionResult> {
  const currentStep = Math.max(step, (history || []).length + 1);

  // 1. DB에서 실존 매장 목록 조회 (데이터 기반 검토)
  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, name, category, address, region, pet_size, price_range, is_active, slug')
    .eq('is_active', true);

  const availableBusinessesSummary = (businesses || [])
    .map((b) => `- [${b.name}] (${b.category}): ${b.address}, 지원체급: ${b.pet_size || '전견종'}`)
    .join('\n');

  // 2. 관리자 설정 프롬프트 조회 (SSOT 원칙에 따라 DB에서만 읽어옴)
  let systemPrompt = FALLBACK_SAFE_PROMPT;
  try {
    const { data: config } = await supabaseAdmin
      .from('tobo_system_configs')
      .select('system_prompt')
      .eq('id', 'TOBO_CORE_PROMPT')
      .single();
    if (config?.system_prompt) systemPrompt = config.system_prompt;
  } catch (e) {
    // DB 테이블 미생성 시 fallback
  }

  // 3. 의도 구조화 및 카드 준비 (단, 손님이 특정 업종을 명시했을 때만 카드를 자연스럽게 제공)
  const structured: StructuredIntent = structureUserIntent(message);
  let leadCard: LeadQuestionCard | undefined = undefined;

  // 손님이 명확하게 예약 업종을 지정한 경우에만 해당 업종 세부 카드 제공 (맥락 파괴 방지)
  const lowerMsg = (message || '').toLowerCase();
  const isQuestioningOrMeta = lowerMsg.includes('맞니') || lowerMsg.includes('왜') || lowerMsg.includes('어색') || lowerMsg.includes('도와줄수');

  if (!isQuestioningOrMeta && structured.detectedDomain && structured.intentType === 'SUPPORTED_SERVICE') {
    leadCard = prepareLeadMaterial(structured.detectedDomain, structured.intentType, currentStep);
  }

  // 4. 이전 대화 기록 포맷팅
  const formattedHistory = (history || [])
    .map((h: any) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`)
    .join('\n');

  // 5. 실제 Gemma 31B 모델에게 완전한 대화 자율성을 부여하여 발화 생성
  const prompt = `${systemPrompt}

[현재 등록된 실존 제휴 매장 데이터베이스]:
${availableBusinessesSummary}

[이전 대화 기록]:
${formattedHistory}

[고객의 현재 메시지]: "${message}"

손님의 말에 공감하고 맥락에 맞추어 유연하고 자연스럽게 답변하세요. (토보의 답변):`;

  let aiReply = '';
  try {
    const raw = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
    aiReply = raw.replace(/^["']|["']$/g, '').trim();
  } catch (e) {
    // 네트워크 오류 또는 LLM 할당량 초과 시, 사하구 등의 지역 하드코딩 없이 범용적인 에러 메시지를 반환합니다.
    aiReply = '네, 보호자님! 현재 원하시는 지역 내 등록된 제휴 매장 중 적합한 일정을 확인해 드릴게요. 편하게 말씀해 주세요.';
  }

  return {
    reply: aiReply,
    card: leadCard,
    isUnmet: structured.intentType === 'UNMET_DEMAND',
    step: currentStep + 1
  };
}
