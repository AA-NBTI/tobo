/**
 * 🃏 [2단계] 대화 리드 자료 준비 오케스트레이터 (Lead Material Orchestrator)
 */

export enum FunnelStage {
  GOAL_DISCOVERY = 0,    // 목적 파악
  DETAIL_GATHERING = 1,  // 상세 조건 파악
  NARROWING = 2,         // 매장 제안/좁히기
  CONFIRMATION = 3,      // 예약 확정
}

export interface CardTemplate {
  card_type: string;
  required_slots: string[];
  stage: FunnelStage;
  priority: number;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  { card_type: "category_select",       required_slots: [], stage: FunnelStage.GOAL_DISCOVERY, priority: 0 },
  { card_type: "region_select",         required_slots: ["category"], stage: FunnelStage.DETAIL_GATHERING, priority: 1 },
  // 1-c 업종별 세부조건 카드 (우선순위 2 - 지역 다음)
  { card_type: "pet_size_select",       required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  { card_type: "duration_select",       required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  { card_type: "clinic_purpose_select", required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  // 1-d 우선순위 파악 (우선순위 3 - 세부조건 완료 후)
  { card_type: "priority_select",       required_slots: ["category", "region_hint", "detail_gathered"], stage: FunnelStage.DETAIL_GATHERING, priority: 3 },
  // 1-e 매장 리스트 제안 (우선순위 4 - 세부조건과 우선순위 파악 후)
  { card_type: "business_list",         required_slots: ["category", "region_hint", "priority"], stage: FunnelStage.NARROWING, priority: 4 },
  // 1-f 날짜 / 시간 선택 (우선순위 5, 6)
  { card_type: "date_select",           required_slots: ["category", "region_hint", "business_id"], stage: FunnelStage.NARROWING, priority: 5 },
  { card_type: "time_slot",             required_slots: ["category", "region_hint", "business_id", "target_date"], stage: FunnelStage.NARROWING, priority: 6 },
  // 1-g 예약 확정 (우선순위 7)
  { card_type: "reservation_confirm",   required_slots: ["category", "region_hint", "business_id", "target_date", "target_time"], stage: FunnelStage.CONFIRMATION, priority: 7 },
];

export interface LeadQuestionCard {
  type?: string;
  cardId: string;
  title: string;
  options?: Array<{ label: string; value: any }>;
  isUnmetCollector?: boolean;
}

export interface BestCardResult {
  cardType: string | null;
  stage: FunnelStage;
  action: "SHOW_CARD" | "NONE";
}

export function selectBestCard(
  filledSlots: Set<string>,
  lastShownCardType: string | null,
  turnsSinceLastShown: number,
  userForceReshow: boolean,
  category?: string | null
): BestCardResult {
  // 1. 미지원 수요(UNSUPPORTED) 최우선 처리
  if (category === "UNSUPPORTED") {
    if (lastShownCardType === "unmet_notification" && !userForceReshow && turnsSinceLastShown < 2) {
      return { cardType: null, stage: FunnelStage.GOAL_DISCOVERY, action: "NONE" };
    }
    return { cardType: "unmet_notification", stage: FunnelStage.GOAL_DISCOVERY, action: "SHOW_CARD" };
  }

  // 2. 정상 퍼널 매칭
  const eligible = CARD_TEMPLATES.filter(t => 
    t.required_slots.every(s => filledSlots.has(s))
  );
  const best = eligible.sort((a, b) => b.priority - a.priority)[0];

  if (!best) {
    return { cardType: null, stage: FunnelStage.GOAL_DISCOVERY, action: "NONE" };
  }

  // 3. 루프 방지 로직 (같은 카드 반복 노출 제한)
  if (best.card_type === lastShownCardType && !userForceReshow && turnsSinceLastShown < 2) {
    return { cardType: null, stage: best.stage, action: "NONE" };
  }

  return { cardType: best.card_type, stage: best.stage, action: "SHOW_CARD" };
}

export function prepareLeadMaterial(cardType: string, category: string | null): LeadQuestionCard {
  if (cardType === 'category_select') {
    return {
      type: 'category_select_picker',
      cardId: 'CATEGORY_SELECTOR',
      title: '어떤 서비스의 예약을 도와드릴까요?',
      options: [
        { label: '✂️ 강아지 미용 / 목욕', value: { category: 'pet_grooming' } },
        { label: '🏥 동물병원 / 진료', value: { category: 'clinic' } },
        { label: '🏨 애견호텔 / 유치원', value: { category: 'pet_hotel' } },
        { label: '🍽️ 애견동반 식당 / 카페', value: { category: 'pet_dining' } },
        { label: '🏕️ 애견동반 펜션 / 풀빌라', value: { category: 'pet_pension' } },
        { label: '💡 다른 서비스 찾기', value: { category: 'UNSUPPORTED' } }
      ]
    };
  }

  if (cardType === 'region_select') {
    return {
      type: 'region_select_picker',
      cardId: 'REGION_SELECTOR',
      title: '어느 지역의 매장을 찾으시나요?',
      options: [
        { label: '📍 하단역 주변 (역세권)', value: { region_hint: '하단역' } },
        { label: '📍 동아대 승학캠퍼스 주변', value: { region_hint: '동아대' } },
        { label: '📍 하단 아트몰링 주변', value: { region_hint: '아트몰링' } },
        { label: '📍 사하구 전체 검색', value: { region_hint: '사하구' } }
      ]
    };
  }

  if (cardType === 'date_select') {
    return {
      type: 'date_select_picker',
      cardId: 'DATE_SELECTOR',
      title: '방문 원하시는 날짜를 선택해 주세요.',
      options: [
        { label: '🗓️ 오늘', value: { target_date: '오늘' } },
        { label: '🗓️ 내일', value: { target_date: '내일' } },
        { label: '🗓️ 이번 주말', value: { target_date: '이번주말' } },
        { label: '📅 직접 선택', value: { open_calendar: true } }
      ]
    };
  }

  if (cardType === 'unmet_notification') {
    return {
      type: 'unmet_notification_picker',
      cardId: 'UNMET_NOTIFICATION_CARD',
      title: '앗! 아직 준비 중인 서비스예요. 😢 오픈 시 가장 먼저 알려드릴까요?',
      isUnmetCollector: true,
      options: [
        { label: '🔔 서비스 오픈 알림 신청하기', value: { notify_agree: true } },
        { label: '💡 다른 서비스 찾아보기', value: { back_to_home: true } }
      ]
    };
  }

  if (cardType === 'pet_size_select') {
    return {
      type: 'pet_size_select_picker',
      cardId: 'PET_SIZE_SELECTOR',
      title: '반려동물의 체급을 알려주세요.',
      options: [
        { label: '🐶 소형견 (~5kg)', value: { pet_size: '소형견' } },
        { label: '🐕 중형견 (5~15kg)', value: { pet_size: '중형견' } },
        { label: '🦮 대형견 (15kg~)', value: { pet_size: '대형견' } },
        { label: '🐈 고양이', value: { pet_size: '고양이' } }
      ]
    };
  }

  if (cardType === 'style_select') {
    return {
      type: 'style_select_picker',
      cardId: 'STYLE_SELECTOR',
      title: '원하시는 미용 스타일이 있나요?',
      options: [
        { label: '✂️ 전체 가위컷', value: { style: '가위컷' } },
        { label: '🛁 기본 목욕/위생', value: { style: '목욕' } },
        { label: '🧴 스파/피부케어', value: { style: '스파' } },
        { label: '💬 상담 후 결정', value: { style: '상담' } }
      ]
    };
  }

  if (cardType === 'duration_select') {
    return {
      type: 'duration_select_picker',
      cardId: 'DURATION_SELECTOR',
      title: '숙박/돌봄 기간을 알려주세요.',
      options: [
        { label: '☀️ 데이케어 (반나절)', value: { duration: '데이케어' } },
        { label: '🌙 1박 2일', value: { duration: '1박2일' } },
        { label: '🧳 장기 숙박 (3박 이상)', value: { duration: '장기' } }
      ]
    };
  }

  if (cardType === 'clinic_purpose_select') {
    return {
      type: 'clinic_purpose_select_picker',
      cardId: 'CLINIC_PURPOSE_SELECTOR',
      title: '병원 방문 목적을 선택해주세요.',
      options: [
        { label: '💉 정기 검진/접종', value: { clinic_purpose: '검진' } },
        { label: '🩺 일반 진료', value: { clinic_purpose: '진료' } },
        { label: '🚨 응급/수술', value: { clinic_purpose: '응급수술' } }
      ]
    };
  }

  if (cardType === 'priority_select') {
    return {
      type: 'priority_select_picker',
      cardId: 'PRIORITY_SELECTOR',
      title: '예약 시 가장 중요하게 생각하시는 부분은 무엇인가요?',
      options: [
        { label: '💰 가성비 (저렴한 가격)', value: { priority: 'price' } },
        { label: '🚶 가까운 거리 (도보권)', value: { priority: 'distance' } },
        { label: '⭐ 높은 평점/전문성', value: { priority: 'rating' } },
        { label: '⚡ 빠른 예약/진료', value: { priority: 'speed' } }
      ]
    };
  }

  if (cardType === 'business_list') {
    return {
      type: 'business_list',
      cardId: 'BUSINESS_LIST_SELECTOR',
      title: '조건에 맞는 추천 매장입니다. 원하시는 곳을 선택해주세요.',
    };
  }

  if (cardType === 'time_slot') {
    return {
      type: 'time_slot_picker',
      cardId: 'TIME_SLOT_PICKER',
      title: '방문하실 시간을 선택해주세요.',
    };
  }

  if (cardType === 'reservation_confirm') {
    return {
      type: 'reservation_confirm',
      cardId: 'RESERVATION_CONFIRM',
      title: '예약 정보를 확인하고 확정해주세요.',
    };
  }

  return {
    type: 'unknown',
    cardId: 'UNKNOWN',
    title: '안내를 준비 중입니다.',
  };
}

// ─────────────────────────────────────────────────────────────
// 🔒 공유 슬롯 유틸 — 카드 경로와 텍스트 경로가 반드시 이 함수만 사용할 것.
//    절대 각자 독립적으로 Set/Object를 구성하면 안 됨.
// ─────────────────────────────────────────────────────────────

export type SlotMap = {
  category?: string | null;
  region_hint?: string | null;
  pet_size?: string | null;
  style?: string | null;
  priority?: string | null;
  duration?: string | null;
  clinic_purpose?: string | null;
  target_date?: string | null;
  target_time?: string | null;
  business_id?: string | null;
  business_name?: string | null;
  party_size?: string | null;
  [key: string]: any;
};

/**
 * SlotMap → Set<string> 변환 (단일 진실의 원천).
 * detail_gathered 도 여기서 자동 판별.
 */
export function buildFilledSlots(slots: SlotMap): Set<string> {
  const s = new Set<string>();
  if (slots.category)       s.add('category');
  if (slots.region_hint)    s.add('region_hint');
  if (slots.pet_size)       s.add('pet_size');
  if (slots.style)          s.add('style');
  if (slots.priority)       s.add('priority');
  if (slots.duration)       s.add('duration');
  if (slots.clinic_purpose) s.add('clinic_purpose');
  if (slots.target_date)    s.add('target_date');
  if (slots.target_time)    s.add('target_time');
  if (slots.business_id)    s.add('business_id');
  if (computeDetailGathered(slots)) s.add('detail_gathered');
  return s;
}

/**
 * 슬롯 머지 — 기존 슬롯에 신규 클릭값(또는 LLM 추출값)을 덮어씀.
 * null/undefined 값은 기존값을 유지.
 */
export function mergeSlots(existing: SlotMap, incoming: SlotMap): SlotMap {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (v !== null && v !== undefined && v !== '') {
      merged[k] = v;
    }
  }
  return merged;
}

/**
 * 업종별 세부조건 충족 여부 계산 (결정론적 코드).
 */
export function computeDetailGathered(slots: SlotMap): boolean {
  const { category, pet_size, style, duration, clinic_purpose, region_hint } = slots;
  if (category === 'pet_grooming') return !!(pet_size || style);
  if (category === 'pet_hotel')    return !!(duration || pet_size);
  if (category === 'clinic')       return !!clinic_purpose;
  if (category === 'pet_dining')   return !!region_hint;
  if (category === 'pet_pension')  return !!region_hint;
  return !!region_hint;
}
