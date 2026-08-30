import { SupabaseClient } from '@supabase/supabase-js';
import { generateEnforcedAIContent, generateEmbedding } from '../../../utils/ai-core';
import { prepareLeadMaterial, LeadQuestionCard, selectBestCard, FunnelStage } from './lead-material-orchestrator';
import { rankRealBusinesses } from './matching-scorer';
import { extractSlots } from './slot-extractor';
import { HIDDEN_NEEDS_CATALOG } from './hidden_needs_catalog';

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

[핵심 역할 및 자율성 원칙 (브레인스토밍/탐색 모드)]:
1. [짧고 유연한 티키타카]: 고객이 무언가 물어봤을 때 다짜고짜 매장 리스트나 예약 폼부터 던지지 마세요. 고객의 상황에 공감하며 **짧은 질문 딱 한 개**만 던져서 진짜 원하는 게 뭔지 파악하세요.
2. [결정 유보 (능동 제안)]: 고객의 니즈가 100% 명확하지 않다면 임의로 결론짓지 말고, 숨은 니즈(예: 이동수단, 노령견 안심 케어 등)를 캐내어 먼저 가볍게 제안해 보세요.
3. [자연스러운 톤앤매너]: 강박적으로 로봇처럼 굴지 말고, 동네 친한 단골 가게 사장님처럼 대화하되, 절대 길게 말하지 말고 핵심만 1~2문장으로 말하세요.`;


/**
 * 🐶 [3단계] 토보 자율성 보장형 자연스러운 응대 엔진
 */
export async function executeToboResponse(
  supabaseAdmin: SupabaseClient,
  message: string,
  history: any[] = [],
  step: number = 1,
  userId: string = 'anonymous',
  contextBusinessId?: string // 새 대화 진입 시 특정 업체 문맥이 있을 경우
): Promise<ToboExecutionResult> {
  const currentStep = Math.max(step, (history || []).length + 1);

  // (Moved DB query to after extractSlots to filter by intent)

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

  // 3. 통합 의도 및 슬롯 추출 엔진 호출 (NEW ARCHITECTURE)
  const intentData = await extractSlots(message, history, supabaseAdmin);
  const { category, target_date, target_time, region_hint, force_reshow, party_size } = intentData.slots;

  // [메모리 (재방문 손님) 조회 - category가 없거나 대화 극초기일 때]
  let recalledMemoryText = '';
  if (userId !== 'anonymous' && message) {
    // bot_memories 테이블의 bot_id가 UUID 타입이므로 "tobo-" 접두사를 붙일 수 없습니다.
    // 비즈니스 ID 자체를 사용하거나, 글로벌일 경우 00000000-0000-0000-0000-000000000000 사용
    const memoryBotId = contextBusinessId ? contextBusinessId : '00000000-0000-0000-0000-000000000000';
    try {
      let query = supabaseAdmin.from('bot_memories')
        .select('*')
        .eq('bot_id', memoryBotId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.ilike('content', `%[CAT:${category}]%`);
      }

      const { data: matchingMemories, error: selectErr } = await query.limit(1);
      
      if (selectErr) {
        console.error(`❌ [Tobo Memory] DB 조회 실패:`, selectErr);
      } else if (matchingMemories && matchingMemories.length > 0) {
        // [CAT:...] 태그 제거 후 텍스트만 추출
        const rawContent = matchingMemories[0].content;
        const cleanContent = rawContent.replace(/ \[CAT:.*?\]/g, '').trim();
        recalledMemoryText = cleanContent;
        console.log(`✅ [Tobo Memory] 기억 불러오기 성공 (Exact Match): ${cleanContent}`);
      }
    } catch (e) {
      console.warn("Memory retrieve failed", e);
    }
  }

  // 3-1. 하이브리드 벡터 검색 (RAG) - Cloudflare 임베딩 엔진 활용
  let businesses: any[] = [];
  try {
    const messageEmbedding = await generateEmbedding(message);
    if (messageEmbedding) {
      const { data: matchedBusinesses, error: rpcError } = await supabaseAdmin.rpc('match_businesses', {
        query_embedding: messageEmbedding,
        match_threshold: 0.1,
        match_count: 5, // 가장 관련성 높은 Top 5만 추출 (프롬프트 과부하 방지)
        filter_category: intentData.slots.category && intentData.slots.category !== 'UNSUPPORTED' ? intentData.slots.category : null,
        filter_region: intentData.slots.region_hint || null
      });
      if (!rpcError && matchedBusinesses) {
        businesses = matchedBusinesses;
      }
    }
  } catch (err) {
    console.warn('Embedding match failed, falling back to SQL', err);
  }

  // 벡터 매칭 실패 또는 데이터가 없을 경우 기존 SQL 필터링 (Fallback)
  if (!businesses || businesses.length === 0) {
    console.warn('⚠️ VECTOR_SEARCH_EMPTY_FALLBACK: RAG 검색 결과가 0건이거나 실패하여 기존 SQL 검색으로 우회합니다.');
    
    let query = supabaseAdmin
      .from('businesses')
      .select('id, name, category, address, region, pet_size, price_range, is_active, slug')
      .eq('is_active', true);
      
    if (intentData.slots.category && intentData.slots.category !== 'UNSUPPORTED') {
      query = query.eq('category', intentData.slots.category);
    }
    if (intentData.slots.region_hint) {
      query = query.like('region', `%${intentData.slots.region_hint}%`);
    }
    const { data: fallbackBusinesses } = await query.limit(5);
    businesses = fallbackBusinesses || [];
  }

  const availableBusinessesSummary = (businesses || [])
    .map((b) => `- [${b.name}] (${b.category}): ${b.address}, 지원체급: ${b.pet_size || '전견종'}`)
    .join('\n');

  let leadCard: LeadQuestionCard | undefined = undefined;
  let actionDirective = '';

  const STAGE_COPY_GUIDE: Record<FunnelStage, string> = {
    [FunnelStage.GOAL_DISCOVERY]: "고객이 아직 목적을 안 밝혔다. 궁금증을 유발하며 선택지를 재미있게 제시하라.",
    [FunnelStage.DETAIL_GATHERING]: "목적은 확인됐다. 자연스럽게 세부 조건(날짜/시간)을 하나씩 좁혀가라.",
    [FunnelStage.NARROWING]: "조건이 거의 다 모였다. 신속하게 마무리 정보를 확인하라.",
    [FunnelStage.CONFIRMATION]: "모든 조건이 확정됐다. 확신을 주는 톤으로 예약 확정을 안내하라.",
  };

  if (intentData.conversation_type === 'OFF_TOPIC') {
    // [분기 1] 일반 대화/인사
    actionDirective = `[시스템 지시사항] 사용자가 예약이나 서비스 요청이 아닌 일반적인 대화(인사, 잡담 등)를 하고 있습니다. 서비스 제안이나 질문 없이, 맥락에 맞추어 유연하고 자연스럽게 스몰토크에 응답하고 공감해주세요.`;
  } else {
    // SERVICE_REQUEST: 다중 카드 및 퍼널 알고리즘 적용
    const { category, target_date, target_time, region_hint } = intentData.slots;
    
    // 채워진 슬롯 Set 생성
    const filledSlots = new Set<string>();
    if (category) filledSlots.add('category');
    if (target_date) filledSlots.add('target_date');
    if (target_time) filledSlots.add('target_time');
    if (region_hint) filledSlots.add('region_hint');
    if (contextBusinessId) {
      filledSlots.add('business_id');
      filledSlots.add('priority');
    }

    // 세션 상태 파싱 (루프 방지용)
    let lastShownCardType: string | null = null;
    let turnsSinceLastShown = 999;
    
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') {
        const content = history[i].content || '';
        if (history[i].cardType) {
          lastShownCardType = history[i].cardType;
        } else if (content.includes('어떤 서비스의 예약을 도와드릴까요?')) {
          lastShownCardType = 'category_select';
        } else if (content.includes('어느 지역의 매장을 찾으시나요?')) {
          lastShownCardType = 'region_select';
        } else if (content.includes('방문 원하시는 날짜를 선택해 주세요.')) {
          lastShownCardType = 'date_select';
        }
        
        if (lastShownCardType) {
          turnsSinceLastShown = Math.floor((history.length - 1 - i) / 2);
          break;
        }
      }
    }

    const userForceReshow = intentData.slots.force_reshow;

    // 최적의 카드와 퍼널 단계(Stage) 판별
    const { cardType, stage, action } = selectBestCard(
      filledSlots,
      lastShownCardType,
      turnsSinceLastShown,
      userForceReshow,
      category
    );
    
    const stageCopy = STAGE_COPY_GUIDE[stage];
    
    if (action === "SHOW_CARD" && cardType) {
      // UI 카드 생성 (프론트에 전달될 데이터)
      leadCard = prepareLeadMaterial(cardType, category);

      // [메모리 저장 - 예약 확정 단계]
      if (cardType === 'reservation_confirm' && userId !== 'anonymous') {
        try {
          const summaryPrompt = `다음 대화에서 고객이 언급한 알러지, 선호 스타일 등 '특이사항'만 1문장으로 요약하세요. 없으면 '없음' 출력.\n\n대화내역:\n${history.map(h=>h.content).join('\n')}\n${message}`;
          const summary = (await generateEnforcedAIContent(summaryPrompt, 'gemma-4-31b-it')).trim();
          if (summary && summary !== '없음') {
            // bot_memories 테이블의 bot_id가 UUID 타입이므로 "tobo-" 접두사를 붙일 수 없습니다.
            const memoryBotId = filledSlots.has('business_id') ? contextBusinessId : (contextBusinessId ? contextBusinessId : '00000000-0000-0000-0000-000000000000');
            
            // 카테고리를 메타데이터처럼 content에 태깅하여 저장
            const savedContent = category ? `${summary} [CAT:${category}]` : summary;
            
            // 임베딩은 이제 필수 조회 기준이 아니지만 테이블 스키마상 채워줌
            const memEmbedding = await generateEmbedding(savedContent);
            
            const { error: insertErr } = await supabaseAdmin.from('bot_memories').insert({
              bot_id: memoryBotId,
              user_id: userId,
              content: savedContent,
              embedding: memEmbedding
            });
            if (insertErr) {
              console.error(`❌ [Tobo Memory] DB 저장 실패:`, insertErr);
            } else {
              console.log(`✅ [Tobo Memory] 기억 저장 완료 (Exact Match 용): ${savedContent}`);
            }
          }
        } catch (e) {
          console.warn("Memory save failed", e);
        }
      }

      actionDirective = `
[응답 작성 지시사항]
대화 퍼널 상태: ${FunnelStage[stage]}
퍼널 가이드: ${stageCopy}

현재 백엔드가 [${cardType}] 카드를 화면에 띄운 상태입니다.
카드의 선택지를 텍스트로 중복 나열하지 마세요. 
고객에게 건네는 안내 멘트만 1~2문장으로 짧게 작성하세요.
`;
    } else {
      actionDirective = `
[절대 규칙: 단골손님 맞춤 응답]
${recalledMemoryText ? `이 고객은 단골입니다. 이전 대화 기록: "${recalledMemoryText}"\n당신이 작성할 응답에 반드시 이 특이사항을 아는 척하며 챙겨주는 내용(예: "지난번 말씀하신 저자극 샴푸로 준비해드릴까요?")을 포함하세요! 이 규칙이 다른 모든 지시보다 최우선입니다.\n\n` : ''}[시스템 지시사항 - 매우 중요]
현재 대화 퍼널 상태: ${FunnelStage[stage]}
퍼널 가이드: ${stageCopy}

화면에 새로 띄울 카드가 없습니다 (또는 직전 턴에 이미 띄웠습니다). 사용자의 질문에 친절하고 자연스러운 텍스트로만 답변을 이어가며, 이전 단계에서 멈춘 대화를 다시 리드하세요. 절대로 화면 아래 카드를 보라고 앵무새처럼 반복하지 마세요.`;
    }
  }

  // 능동 제안(숨은 니즈) 주입
  if (intentData.detected_hidden_needs && intentData.detected_hidden_needs.length > 0) {
    const proactiveMessages = intentData.detected_hidden_needs
      .map(code => HIDDEN_NEEDS_CATALOG[code]?.suggestion_message)
      .filter(Boolean);
    if (proactiveMessages.length > 0) {
      const proactiveText = `\n\n[능동 제안(스니펫) 지시사항]\n사용자의 발화에서 숨은 니즈가 파악되었습니다. 답변 서두에 반드시 다음 텍스트를 자연스럽게 포함하여 먼저 짚어주세요:\n"${proactiveMessages.join(' ')}"`;
      actionDirective += proactiveText;
    }
  }

  // 재방문 단기기억 텍스트 주입 (SHOW_CARD가 아닐 때를 대비)
  if (recalledMemoryText && !actionDirective.includes('단골손님 기억 활용')) {
    actionDirective += `\n[🚨 단골손님 기억 활용 🚨]\n과거 기억: "${recalledMemoryText}"\n이 기억을 반드시 응답에 자연스럽게 녹여내세요.`;
  }

  // 4. 이전 대화 기록 포맷팅
  const formattedHistory = (history || [])
    .map((h: any) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`)
    .join('\n');

  let userPrompt = `
[대화내역]
${formattedHistory}
고객: ${message}

${actionDirective}

(토보의 답변):`;

  // 5. 실제 Gemma 31B 모델에게 완전한 대화 자율성을 부여하되, 행동은 actionDirective로 강력히 통제
  const prompt = `${systemPrompt}

[현재 등록된 실존 제휴 매장 데이터베이스]:
${availableBusinessesSummary}

${userPrompt}`;


  let aiReply = '';
  try {
    aiReply = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it');
    
    // 🔥 5.1 프로그래밍 방식의 단골손님 기억 강제 결합 (LLM 프롬프트 대신 백엔드에서 100% 삽입)
    if (recalledMemoryText) {
      const memoryPrefix = `지난번처럼 ${recalledMemoryText} 신경써서 준비해드릴까요?\n`;
      aiReply = memoryPrefix + aiReply;
    }
    
  } catch (e: any) {
    console.error('LLM Engine Error:', e);
    aiReply = '네, 보호자님! 현재 원하시는 지역 내 등록된 제휴 매장 중 적합한 일정을 확인해 드릴게요. 편하게 말씀해 주세요. (에러: ' + e.message + ')';
  }

  return {
    reply: aiReply,
    card: leadCard,
    isUnmet: false,
    step: currentStep + 1
  };
}
