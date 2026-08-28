/**
 * 🃏 [2단계] 대화 리드 자료 준비 오케스트레이터 (Lead Material Orchestrator)
 * - 실제 DB 등록 카테고리를 반영한 올바른 최상위 선택 카드 디스패치
 * - "예약 가능하니?" ➔ 업종을 모를 땐 미용 카드가 아니라 [최상위 업종 선택 카드] 제시!
 */

export interface LeadQuestionCard {
  type?: string;
  cardId: string;
  title: string;
  options: Array<{ label: string; value: any }>;
  isUnmetCollector?: boolean;
}

export function prepareLeadMaterial(
  detectedDomain: string | null,
  intentType: string,
  turnStep: number,
  unmetDetail?: any
): LeadQuestionCard {
  // 1. 미지원 잠재 수요 발생 시 ➔ [신규 출시 알림 신청 카드] 준비
  if (intentType === 'UNMET_DEMAND' && unmetDetail) {
    return {
      type: 'unmet_notification_picker',
      cardId: 'UNMET_NOTIFICATION_CARD',
      title: `${unmetDetail.label} 오픈 시 알림을 받으시겠어요?`,
      isUnmetCollector: true,
      options: [
        { label: '🔔 서비스 오픈 시 알림 신청하기', value: { notify_agree: true, category: unmetDetail.category } },
        { label: '📍 하단동 인근 다른 서비스 알아보기', value: { explore_other: true } },
        { label: '💡 다른 서비스를 찾고 있어요', value: { custom_request: true } }
      ]
    };
  }

  // 2. 도메인 미식별 상태 ("예약 가능하니?") ➔ [최상위 업종 선택 카드] 준비 (미용 카드 들이밀기 금지!)
  if (!detectedDomain || turnStep <= 1) {
    return {
      type: 'root_domain_picker',
      cardId: 'ROOT_DOMAIN_SELECTOR',
      title: '어떤 서비스의 예약을 도와드릴까요?',
      options: [
        { label: '✂️ 애견 미용 / 스파', value: { domain: 'pet_grooming' } },
        { label: '🩺 동물병원 / 24시 응급 진료', value: { domain: 'clinic' } },
        { label: '🏨 펫 호텔 / 데이 유치원', value: { domain: 'pet_hotel' } },
        { label: '🍽️ 반려견 동반 식당 / 카페', value: { domain: 'pet_dining' } },
        { label: '🏕️ 반려견 동반 독채 펜션 / 풀빌라', value: { domain: 'pet_pension' } },
        { label: '💡 찾는 서비스가 없어요 (기타)', value: { domain: 'unmet_custom' } }
      ]
    };
  }

  // 3. 도메인 식별 후 2턴 ➔ [반려동물 기본 제원/체급 확인 카드]
  if (turnStep === 2) {
    return {
      type: 'pet_size_picker',
      cardId: 'PET_PROFILE_SIZE_SELECTOR',
      title: '함께하는 소중한 아이의 체급/품종을 알려주세요',
      options: [
        { label: '소형견 (~5kg 말티즈/포메/푸들)', value: { size: 'small', max_weight: 5 } },
        { label: '중형견 (5~12kg 비숑/코기/시바)', value: { size: 'medium', max_weight: 12 } },
        { label: '대형견 (12kg~ 리트리버/진도)', value: { size: 'large', max_weight: 30 } },
        { label: '시니어 노령견 (10세 이상 안심케어)', value: { size: 'senior', is_senior: true } },
        { label: '💡 고양이 또는 특수 반려동물', value: { special_pet: true } }
      ]
    };
  }

  // 4. 애견미용 선택 시에만 ➔ [미용 스타일 카드] 제시
  if (detectedDomain === 'pet_grooming') {
    return {
      type: 'beauty_style_picker',
      cardId: 'GROOMING_STYLE_SELECTOR',
      title: '희망하시는 미용/스파 스타일을 선택해 주세요',
      options: [
        { label: '전체 가위컷 & 위생 스타일링', value: { style: 'scissor_cut' } },
        { label: '프리미엄 탄산 스파 & 저자극 목욕', value: { style: 'spa' } },
        { label: '기본 위생 클리핑 (3mm/5mm)', value: { style: 'clipping' } },
        { label: '1:1 단독 룸 노령견 안심 케어', value: { private_care: true } },
        { label: '💡 다른 미용 스타일/상담 필요', value: { custom_style: true } }
      ]
    };
  }

  if (detectedDomain === 'clinic') {
    return {
      type: 'clinic_urgency_picker',
      cardId: 'CLINIC_URGENCY_SELECTOR',
      title: '현재 아이의 상태와 필요한 진료를 선택해 주세요',
      options: [
        { label: '🚨 야간 응급 외상 / 24시 수술실 필요', value: { urgent: true } },
        { label: '🩺 슬개골/관절 정형외과 정밀 검진', value: { department: 'orthopedics' } },
        { label: '💉 기본 건강검진 및 예방접종', value: { routine: true } },
        { label: '💡 기타 질환 전문의 상담', value: { other_clinic: true } }
      ]
    };
  }

  if (detectedDomain === 'pet_hotel') {
    return {
      type: 'hotel_room_picker',
      cardId: 'HOTEL_ROOM_SELECTOR',
      title: '희망하시는 호텔 룸 타입을 선택해 주세요',
      options: [
        { label: '1인 단독 방음 룸 & 24시간 관리사 상주', value: { room: 'private_soundproof' } },
        { label: '실시간 스마트 CCTV 확인 가능 룸', value: { cctv: true } },
        { label: '야외 천연잔디 운동장 플레이 타임', value: { playground: true } },
        { label: '💡 장기 호텔링 (7일 이상) 상담', value: { long_term: true } }
      ]
    };
  }

  return {
    type: 'default_confirm_picker',
    cardId: 'DEFAULT_CONFIRM_SELECTOR',
    title: '원하시는 방문 일정과 조건을 확정해 드릴까요?',
    options: [
      { label: '📅 이번 주말 예약 슬롯 확인하기', value: { schedule: 'weekend' } },
      { label: '🚗 전용 주차 완비 매장 우선 매칭', value: { parking: true } },
      { label: '💡 다른 조건 추가하기', value: { add_condition: true } }
    ]
  };
}
