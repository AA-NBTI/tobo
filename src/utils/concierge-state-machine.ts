// concierge-state-machine.ts
// AI가 카드를 고르는 것이 아니라, 철저히 결정론적(Deterministic) 코드가 
// 다음 상태와 카드를 결정하는 코어 로직입니다.

export type SlotState = {
  intent_category?: string;
  service_id?: string;
  date?: string; // YYYY-MM-DD
  time_slot?: string; // Slot ID
  party_size?: number;
  contact_confirm?: boolean;
}

export type CardTemplate = {
  card_type: string;
  required_slots: string[];
  priority: number;
}

/**
 * DB에 저장된 card_templates 기준 (더미 혹은 실제 DB 캐시)
 * Priority가 낮을수록 먼저 물어봄 (마찰이 적은 순서)
 */
const DEFAULT_CARD_TEMPLATES: CardTemplate[] = [
  { card_type: 'service_select', required_slots: ['service_id'], priority: 10 },
  { card_type: 'date_picker', required_slots: ['date'], priority: 20 },
  { card_type: 'time_slot', required_slots: ['time_slot'], priority: 30 },
  { card_type: 'party_size', required_slots: ['party_size'], priority: 40 },
  { card_type: 'contact_confirm', required_slots: ['contact_confirm'], priority: 50 },
]

/**
 * 1. 현재 슬롯 상태를 평가하여 누락된 필수 슬롯 중 가장 우선순위가 높은 것을 찾습니다.
 */
export function determineNextCard(currentSlots: SlotState, templates: CardTemplate[] = DEFAULT_CARD_TEMPLATES): string | null {
  // 우선순위 순으로 정렬
  const sortedTemplates = [...templates].sort((a, b) => a.priority - b.priority);

  for (const template of sortedTemplates) {
    // 이 카드가 요구하는 슬롯들이 모두 채워졌는지 확인
    const isMissing = template.required_slots.some(slotKey => {
      const val = (currentSlots as any)[slotKey]
      return val === undefined || val === null || val === ''
    })

    if (isMissing) {
      // 누락된 슬롯이 발견되면 즉시 해당 카드 타입을 반환 (우선순위 큐)
      return template.card_type
    }
  }

  // 모든 카드의 필수 슬롯이 채워졌다면 null 반환 (예약 확정 단계로 진입 가능)
  return null
}

/**
 * 2. AI Prompt Formatter
 * Gemma/Gemini 등 LLM이 환각을 일으키지 않도록 역할을 극도로 제한하는 시스템 프롬프트 생성기
 */
export function buildConciergeSystemPrompt(availableServices: any[], availableSlots: any[]): string {
  return `
당신은 예약 컨시어지 라우터(Router)입니다. 절대 스스로 데이터를 창작하지 마십시오.
사용자의 메시지를 분석하여 다음 JSON 형식으로만 응답하십시오.

[현재 사용 가능한 서비스 목록 (Tool 1 결과)]
${JSON.stringify(availableServices)}

[현재 사용 가능한 시간 슬롯 (Tool 2 결과)]
${JSON.stringify(availableSlots)}

[지시사항]
1. 사용자의 발화에서 서비스명, 날짜, 시간 등의 조건(Slot)을 파악하십시오.
2. 파악된 조건이 위 목록의 데이터와 일치하면 해당 데이터의 'id' 값을 추출하십시오. 절대 가상의 UUID를 만들지 마십시오.
3. 응답은 아래 JSON 스키마를 엄격히 준수하십시오.

{
  "extracted_slots": {
    "service_id": "발견된 서비스 id (없으면 null)",
    "date": "YYYY-MM-DD 형식 (없으면 null)",
    "time_slot": "발견된 시간 슬롯 id (없으면 null)"
  },
  "conversational_reply": "사용자에게 건넬 짧고 자연스러운 문구 (예: '어떤 서비스를 원하시나요?')"
}
  `.trim()
}
