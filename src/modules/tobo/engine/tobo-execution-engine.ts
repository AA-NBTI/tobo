import { SupabaseClient } from '@supabase/supabase-js';
import { generateEnforcedAIContent } from '../../../utils/ai-core.ts';
import { structureUserIntent, StructuredIntent } from './intent-structuring-engine.ts';
import { prepareLeadMaterial, LeadQuestionCard } from './lead-material-orchestrator.ts';
import { rankRealBusinesses } from './matching-scorer.ts';

export interface ToboExecutionResult {
  reply: string;
  card?: LeadQuestionCard;
  isUnmet: boolean;
  unmetCategory?: string;
  step: number;
  recommendationList?: any[];
}

const DEFAULT_SYSTEM_PROMPT = `당신은 부산 사하구 반려동물 맞춤 예약 파인더이자 친절한 AI 컨시어지 '토보(Tobo)'입니다. (모델: Gemma 31B)

[핵심 역할 및 자율성 원칙]:
1. [상식적이고 유연한 대화]: 손님의 발화 의도와 뉘앙스(의문 제기, 불만, 핀트 지적, 잡담, 질문 등)를 정확히 파악하여, 기계적인 앵무새 답변을 절대 하지 말고 살아있는 사람처럼 자연스럽고 지혜롭게 대화하세요. 손님이 답변의 어색함이나 핀트를 지적하면 솔직하게 인정하고 상식적으로 명쾌하게 답변하세요.
2. [데이터 기반 안내]: 부산 사하구 및 인근에 실제로 등록된 제휴 매장(미용, 24시 병원, 호텔, 식당, 펜션 등)의 실존 데이터를 바탕으로 신뢰할 수 있는 정확한 정보를 제공하세요.
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

  // 2. 관리자 설정 프롬프트 조회 (없으면 기본값 사용)
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
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
    aiReply = '네, 보호자님! 현재 사하구 내 등록된 병원, 미용실, 호텔, 식당, 펜션 중 원하시는 일정을 편하게 말씀해 주시면 최적의 곳으로 안내해 드릴게요.';
  }

  return {
    reply: aiReply,
    card: leadCard,
    isUnmet: structured.intentType === 'UNMET_DEMAND',
    step: currentStep + 1
  };
}
