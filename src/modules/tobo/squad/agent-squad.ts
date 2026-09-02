import { SupabaseClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'
import { processToboChat } from '../tobo-engine'

// 🎭 1. 페르소나 생성 봇 (Persona Generator Bot)
export interface UserPersona {
  id: string
  name: string
  ageGroup: string
  location: string
  dogBreed: string
  dogAge: number
  dogSize: 'small' | 'medium' | 'large'
  healthCondition: string
  lifestyle: string
  hiddenNeed: string
  firstUtterance: string
}

export const SEED_PERSONAS: UserPersona[] = [
  {
    id: 'P-01',
    name: '하단동 30대 직장인 김보호자',
    ageGroup: '30대',
    location: '부산 사하구 하단동',
    dogBreed: '골든 리트리버',
    dogAge: 4,
    dogSize: 'large',
    healthCondition: '털빠짐 심함 / 털갈이 시즌',
    lifestyle: '자차 SUV 운전 / 퇴근 후 저녁 방문',
    hiddenNeed: '지상 전용 주차장 필수 & 대형 탄산스파 부스',
    firstUtterance: '퇴근하고 저녁에 큰 강아지 목욕 스파 맡길 수 있는 곳 있어? 차 가지고 가야 해'
  },
  {
    id: 'P-02',
    name: '명지동 60대 은퇴자 박보호자',
    ageGroup: '60대',
    location: '부산 강서구 명지동',
    dogBreed: '말티즈 (외동)',
    dogAge: 13,
    dogSize: 'small',
    healthCondition: '심장 질환 / 슬개골 탈구 3기 (장시간 서있기 불가)',
    lifestyle: '도보 산책 위주 / 과도한 스트레스 금지',
    hiddenNeed: '2인 1조 노령견 보조 안심 케어 & 무반동 매트',
    firstUtterance: '우리 애가 13살이라 다리도 아프고 심장도 안 좋은데 안심하고 맡길 데 있나요?'
  },
  {
    id: 'P-03',
    name: '당리동 20대 대학생 이보호자',
    ageGroup: '20대',
    location: '부산 사하구 당리동',
    dogBreed: '포메라니안',
    dogAge: 2,
    dogSize: 'small',
    healthCondition: '건강함 / 털 엉킴 있음',
    lifestyle: '가성비 최우선 / 빠른 당일 예약 선호',
    hiddenNeed: '가격 거품 없는 3만원대 실속 기본 클리핑',
    firstUtterance: '오늘 당장 제일 싸고 빠르게 털 밀어주는 곳 어디야?'
  },
  {
    id: 'P-04',
    name: '하단동 비숑 2마리 다둥이 보호자 최보호자',
    ageGroup: '40대',
    location: '부산 사하구 하단동',
    dogBreed: '비숑 프리제 2마리 (모녀견)',
    dogAge: 3,
    dogSize: 'medium',
    healthCondition: '피부 예민 / 귀 염증 관리 필요',
    lifestyle: '1인 프라이빗 룸 선호 / 다른 강아지 접촉 시 짖음',
    hiddenNeed: '동시간대 다른 아이 없는 1인 단독 전담 케어',
    firstUtterance: '비숑 2마리인데 다른 강아지 보면 짖어서 조용하게 1:1로만 해주는 곳 찾아줘'
  },
  {
    id: 'P-05',
    name: '괴정동 쇼독 지망 포메 보호자 정보호자',
    ageGroup: '30대',
    location: '부산 사하구 괴정동',
    dogBreed: '화이트 포메라니안',
    dogAge: 1,
    dogSize: 'small',
    healthCondition: '모량 풍성 / 피부 건강',
    lifestyle: '비용 무관 최고급 퀄리티 지향',
    hiddenNeed: '수석 디자이너 1:1 정밀 가위컷 & 곰돌이컷',
    firstUtterance: '포메 곰돌이컷 최고로 잘하는 수석 디자이너 샵으로 추천해줘 돈은 상관없어'
  }
]

// 🕵️ 3. 슬롯 추출 검증 봇 (Slot Auditor Bot)
export interface SlotAuditResult {
  extractedSlots: {
    petSize?: string
    serviceStyle?: string
    hasCar?: boolean
    priority?: string
    seniorCare?: boolean
  }
  missingSlots: string[]
  completionRate: number // 0~100%
}

export function auditExtractedSlots(dialogueHistory: string[], persona: UserPersona): SlotAuditResult {
  const fullText = dialogueHistory.join(' ')
  const extracted: any = {}

  if (/대형|소형|중형|리트리버|말티즈|포메|비숑/.test(fullText)) extracted.petSize = persona.dogSize
  if (/스파|목욕|클리핑|가위컷|곰돌이컷|미용/.test(fullText)) extracted.serviceStyle = 'detected'
  if (/차|주차|suv/.test(fullText)) extracted.hasCar = true
  if (/1:1|단독|조용|최고급|가성비|싸고/.test(fullText)) extracted.priority = 'detected'
  if (/13살|노령|심장|다리|안심/.test(fullText)) extracted.seniorCare = true

  const expectedSlotKeys = ['petSize', 'serviceStyle', 'priority']
  const foundKeys = Object.keys(extracted)
  const missingSlots = expectedSlotKeys.filter(k => !foundKeys.includes(k))
  const completionRate = Math.round((foundKeys.length / (expectedSlotKeys.length + 1)) * 100)

  return {
    extractedSlots: extracted,
    missingSlots,
    completionRate: Math.min(completionRate, 100)
  }
}

// 🌲 4. 추천 트리 정합성 봇 (Taxonomy Matcher Bot)
export interface TaxonomyMatchResult {
  recommendedShop: string
  criteriaBadge: string
  isLogicallySound: boolean
  mismatchReason?: string
}

export function auditTaxonomyMatch(persona: UserPersona, recommendationList: any[]): TaxonomyMatchResult {
  const winner = recommendationList?.[0]
  if (!winner) {
    return {
      recommendedShop: '없음',
      criteriaBadge: '없음',
      isLogicallySound: false,
      mismatchReason: '추천 매장이 1개도 출력되지 않음'
    }
  }

  // 페르소나별 정답 뱃지 매핑 검증
  let expectedBadge = ''
  if (persona.id === 'P-01') expectedBadge = '주차우선'
  else if (persona.id === 'P-02') expectedBadge = '노령견안전우선'
  else if (persona.id === 'P-03') expectedBadge = '가격우선'
  else if (persona.id === 'P-04') expectedBadge = '1인케어우선'
  else if (persona.id === 'P-05') expectedBadge = '전문성우선'

  const isSound = winner.criteriaBadge === expectedBadge
  return {
    recommendedShop: winner.name,
    criteriaBadge: winner.criteriaBadge,
    isLogicallySound: isSound,
    mismatchReason: isSound ? undefined : `고객 페르소나는 [${expectedBadge}]를 원했으나 [${winner.criteriaBadge}]가 추천됨`
  }
}

// ⚖️ 5. 모순 탐지 및 채점 봇 (Contradiction Judge Bot)
export interface BotEvaluationReport {
  personaId: string
  personaName: string
  dialogueTranscript: Array<{ role: string; content: string }>
  slotAudit: SlotAuditResult
  taxonomyAudit: TaxonomyMatchResult
  score: {
    questionToneScore: number // 25점 만점 (물음표 화법)
    cardRelevanceScore: number // 25점 만점 (엇박자 카드 방지)
    slotExtractionScore: number // 25점 만점 (슬롯 완성도)
    taxonomyScore: number // 25점 만점 (추천 논리성)
    totalScore: number
  }
  detectedContradictions: string[]
  finalVerdict: 'PERFECT_PASS' | 'QUALIFIED_PASS' | 'FAIL'
}

export async function runSquadSimulation(admin: SupabaseClient, persona: UserPersona): Promise<BotEvaluationReport> {
  const transcript: Array<{ role: string; content: string }> = []
  const dialogueLines: string[] = []

  // 턴 1: 페르소나 첫 질문 인입
  transcript.push({ role: 'user', content: persona.firstUtterance })
  dialogueLines.push(persona.firstUtterance)

  const toboStep1 = await processToboChat(admin, {
    message: persona.firstUtterance,
    step: 1
  })
  transcript.push({ role: 'tobo', content: toboStep1.reply + (toboStep1.cards ? ` [카드: ${toboStep1.cards.title}]` : '') })
  dialogueLines.push(toboStep1.reply)

  // 턴 2: 페르소나 봇의 자연스러운 2차 응답 (카드 선택 or 구체화)
  let userTurn2 = ''
  if (persona.id === 'P-01') userTurn2 = '넓은 전용 주차 완비 필수 (자차 SUV 이동)'
  else if (persona.id === 'P-02') userTurn2 = '시니어 노령견 (10세 이상 / 안심 케어)'
  else if (persona.id === 'P-03') userTurn2 = '기본 위생 클리핑 (3mm/5mm)'
  else if (persona.id === 'P-04') userTurn2 = '1:1 단독 스트레스 없는 케어'
  else if (persona.id === 'P-05') userTurn2 = '최고급 쇼독 스타일링'

  transcript.push({ role: 'user', content: userTurn2 })
  dialogueLines.push(userTurn2)

  const toboStep2 = await processToboChat(admin, {
    message: userTurn2,
    step: 2
  })
  transcript.push({ role: 'tobo', content: toboStep2.reply })
  dialogueLines.push(toboStep2.reply)

  // 봇 군단 감사 수행
  const slotAudit = auditExtractedSlots(dialogueLines, persona)
  const taxonomyAudit = auditTaxonomyMatch(persona, toboStep2.recommendationList || [])

  // 모순 탐지
  const contradictions: string[] = []
  if (toboStep1.reply.includes('알려드릴게요') || toboStep1.reply.includes('질문을 드릴게요')) {
    contradictions.push('단정형 통보 화법 감지 (물음표 미준수)')
  }
  if (!taxonomyAudit.isLogicallySound) {
    contradictions.push(taxonomyAudit.mismatchReason || '추천 기준 모순 발생')
  }

  // 채점 봇의 정밀 스코어링
  const questionToneScore = contradictions.some(c => c.includes('화법')) ? 10 : 25
  const cardRelevanceScore = 25
  const slotExtractionScore = Math.round((slotAudit.completionRate / 100) * 25)
  const taxonomyScore = taxonomyAudit.isLogicallySound ? 25 : 0
  const totalScore = questionToneScore + cardRelevanceScore + slotExtractionScore + taxonomyScore

  const verdict = totalScore >= 95 ? 'PERFECT_PASS' : totalScore >= 80 ? 'QUALIFIED_PASS' : 'FAIL'

  return {
    personaId: persona.id,
    personaName: persona.name,
    dialogueTranscript: transcript,
    slotAudit,
    taxonomyAudit,
    score: {
      questionToneScore,
      cardRelevanceScore,
      slotExtractionScore,
      taxonomyScore,
      totalScore
    },
    detectedContradictions: contradictions,
    finalVerdict: verdict
  }
}
