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
  // 업종별 세부조건 카드 (우선순위 2 - 지역 다음)
  { card_type: "pet_size_select",       required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  { card_type: "style_select",          required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  { card_type: "duration_select",       required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  { card_type: "clinic_purpose_select", required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 2 },
  // 1-b 우선순위 파악 (우선순위 3)
  { card_type: "priority_select",       required_slots: ["category", "region_hint"], stage: FunnelStage.DETAIL_GATHERING, priority: 3 },
  // 매장 리스트 제안 (우선순위 4) - 세부조건과 우선순위가 파악된 후 매장 노출
  { card_type: "business_list",         required_slots: ["category", "region_hint", "priority"], stage: FunnelStage.NARROWING, priority: 4 },
  // 매장 확정 후 날짜/시간 선택 (우선순위 5, 6)
  { card_type: "date_select",           required_slots: ["category", "region_hint", "business_id"], stage: FunnelStage.NARROWING, priority: 5 },
  { card_type: "time_slot",             required_slots: ["category", "region_hint", "business_id", "target_date"], stage: FunnelStage.NARROWING, priority: 6 },
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
        { label: '🍽️ 맛집 / 식당', value: { category: 'dining' } },
        { label: '☕ 카페 / 디저트', value: { category: 'cafe' } },
        { label: '🍻 술집 / 이자카야', value: { category: 'bar' } },
        { label: '✂️ 미용실 / 헤어샵', value: { category: 'hair_salon' } },
        { label: '🐶 반려동물 서비스', value: { category: 'pet_service' } },
        { label: '💅 네일 / 뷰티샵', value: { category: 'nail_beauty' } },
        { label: '🏋️ 헬스 / 피트니스', value: { category: 'fitness' } },
        { label: '📸 스튜디오 / 사진관', value: { category: 'studio' } },
        { label: '🏨 숙박 / 모텔 / 호텔', value: { category: 'accommodation' } },
        { label: '🏥 병원 / 의원 (사람용)', value: { category: 'clinic_human' } },
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
