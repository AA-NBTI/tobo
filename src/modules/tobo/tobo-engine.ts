// 🚀 토보 AI 통합 오케스트레이션 엔진 (Tobo Engine)
import { SupabaseClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'
import { detectUnmetDemand, logUnmetDemand } from './demand/demand-logger'
import { selectQuestionCard, QuestionCard } from './cards/card-registry'
import { matchCriteriaShops, ShopItem } from './taxonomy/criteria-matcher'
import { buildToboSystemPrompt } from './intent/intent-detector'

export interface ToboChatPayload {
  message: string
  step?: number
  context?: any
  history?: any[]
  sessionId?: string
  userId?: string
}

export interface ToboChatResult {
  reply: string
  step: number
  sessionId?: string
  cards?: QuestionCard
  recommendationList?: ShopItem[]
}

export async function processToboChat(admin: SupabaseClient, payload: ToboChatPayload): Promise<ToboChatResult> {
  const { message, step = 1, context = {}, history = [], userId } = payload
  let sessionId = payload.sessionId

  // 1. 세션 자동 생성 (ChatGPT/Claude 방식)
  if (!sessionId && userId) {
    const title = message ? message.slice(0, 25) : '새로운 대화'
    const { data: newSession, error: sErr } = await admin
      .from('tobo_sessions')
      .insert({ user_id: userId, title })
      .select()
      .single()
    if (!sErr && newSession) {
      sessionId = newSession.id
    }
  }

  // 2. 미지원 수요(펜션, 호텔 등) 감지 시 백그라운드 DB 자동 적재
  const unmetItem = detectUnmetDemand(message)
  if (unmetItem && userId) {
    logUnmetDemand(admin, userId, sessionId || null, unmetItem, message)
  }

  // 3. 제휴 매장 데이터 조회
  const { data: businesses } = await admin
    .from('businesses')
    .select('id, name, category, address, phone, slug, description, services(id, name, price, duration_minutes)')
    .eq('is_active', true)
    .limit(10)

  const availableCategories = Array.from(new Set((businesses || []).map((b: any) => {
    if (b.category === 'pet_grooming') return '미용/목욕'
    if (b.category === 'clinic') return '병원/클리닉'
    if (b.category === 'pet_hotel') return '호텔/유치원'
    if (b.category === 'pet_dining') return '동반 식당/카페'
    if (b.category === 'pet_pension') return '동반 펜션'
    return b.category
  }))).join(', ') || '미용/목욕'

  const businessKnowledge = (businesses || []).map((b: any) => {
    const svcs = (b.services || []).map((s: any) => `${s.name}(${s.price === 0 ? '무료' : `${s.price.toLocaleString()}원`})`).join(', ')
    return `- [${b.name}] 카테고리: ${b.category}, 위치: ${b.address || '정보없음'}, 서비스: ${svcs || '기본상담'}, 슬러그: ${b.slug}`
  }).join('\n')

  const formattedHistory = (history || []).map((h: any) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`).join('\n')

  // 4. 의도 모듈에서 100% 물음표 화법 프롬프트 빌드
  const systemPrompt = buildToboSystemPrompt(availableCategories, businessKnowledge, context, formattedHistory)
  const aiPrompt = `${systemPrompt}\n\n[고객의 메시지]: "${message}"\n\n토보의 능동적 대화 답변:`

  let aiReply = ''
  try {
    aiReply = await generateEnforcedAIContent(aiPrompt, 'gemma-4-31b-it')
  } catch (aiErr) {
    console.warn('⚠️ [Tobo Engine] AI LLM 에러:', aiErr)
    aiReply = '반갑습니다! 소중한 반려견을 위한 맞춤 샵을 안내해 드려도 괜찮으실까요?'
  }

  // 5. 카드 레지스트리 모듈에서 상황별 질문 카드 디스패치
  const cards = selectQuestionCard(message, step) || undefined

  // 6. 기준 트리 모듈에서 결정론적 추천 매장 매칭 (충분한 대화 턴이 쌓인 후 10턴에 최종 체결)
  const lower = (message || '').toLowerCase()
  const isFinalTurn = step >= 10 || (step >= 5 && (lower.includes('결정') || lower.includes('예약할게요') || lower.includes('여기로 해주세요')))
  let recommendationList: ShopItem[] = []
  if (isFinalTurn) {
    recommendationList = matchCriteriaShops(businesses || [], message, step)
  }
  const nextStep = recommendationList.length > 0 ? 11 : step + 1

  // 7. 대화 메시지 DB 영구 보존
  if (sessionId && message) {
    const messagesToInsert = [
      { session_id: sessionId, role: 'user', content: message },
      { session_id: sessionId, role: 'assistant', content: aiReply?.trim() || '' }
    ]
    await admin.from('tobo_messages').insert(messagesToInsert)
  }

  return {
    reply: aiReply?.trim(),
    step: nextStep,
    sessionId: sessionId || undefined,
    cards,
    recommendationList: recommendationList.length > 0 ? recommendationList : undefined
  }
}
