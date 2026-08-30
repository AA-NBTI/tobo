// 📦 모듈 2: 질문카드 카탈로그 및 디스패처 모듈 (Card Registry)

export interface QuestionCard {
  type: string
  title: string
  options: Array<{ label: string; value: any }>
}

export const QUESTION_CARDS = {
  BEAUTY_STYLE: {
    type: 'beauty_style_picker',
    title: '어떤 케어 프로그램을 희망하시나요?',
    options: [
      { label: '전체 가위컷 & 스타일링', value: { style: 'scissor_cut' } },
      { label: '프리미엄 탄산 스파 & 목욕', value: { style: 'spa' } },
      { label: '기본 위생 클리핑 (3mm/5mm)', value: { style: 'clipping' } },
      { label: '노령견 안심 케어', value: { style: 'senior' } },
    ]
  },
  PET_SIZE: {
    type: 'pet_size_picker',
    title: '아이의 체급/품종을 선택해 주세요',
    options: [
      { label: '소형견 (말티즈/포메 ~5kg)', value: { size: 'small' } },
      { label: '중형견 (비숑/코기 5~12kg)', value: { size: 'medium' } },
      { label: '대형견 (리트리버 12kg~)', value: { size: 'large' } },
      { label: '시니어 노령견 (10세 이상)', value: { size: 'senior' } },
    ]
  },
  PRIORITY_ENV: {
    type: 'priority_picker',
    title: '가장 중요하게 생각하시는 기준을 골라주세요',
    options: [
      { label: '1:1 단독 스트레스 없는 케어', value: { priority: 'private' } },
      { label: '최고급 쇼독 스타일링', value: { priority: 'luxury' } },
      { label: '가성비 좋고 빠른 케어', value: { priority: 'speed_value' } },
      { label: '피부/모질 집중 스파', value: { priority: 'spa_care' } },
    ]
  },
  MOBILITY_PARKING: {
    type: 'mobility_picker',
    title: '이동 및 주차 편의를 선택해 주세요',
    options: [
      { label: '넓은 전용 주차 완비 필수', value: { has_car: true } },
      { label: '집 근처 편한 도보권', value: { mobility: 'walking' } },
      { label: '도어투도어 픽업 희망', value: { pickup: true } },
    ]
  },
  EMERGENCY_TRIAGE: {
    type: 'emergency_triage_picker',
    title: '현재 계신 위치와 응급 상태를 선택해 주세요',
    options: [
      { label: '📍 부산 사하구 (하단/당리) - 즉시 응급', value: { location: '사하구', urgent: true } },
      { label: '📍 부산 강서구 (명지/신호) - 야간 진료', value: { location: '강서구', urgent: false } },
      { label: '📍 부산진구/사상구 - 24시 수술실 필요', value: { location: '부산진구', urgent: true } },
      { label: '일반 건강검진/기본 진료 상담', value: { location: '사하구', urgent: false } },
    ]
  }
}

export function selectQuestionCard(message: string, step: number): QuestionCard | null {
  const lower = message.toLowerCase()

  // 0. 응급/동물병원 질의 시 -> [긴급 위치 및 응급도 선택 카드] 최우선 즉시 디스패치
  if (lower.includes('병원') || lower.includes('24시') || lower.includes('응급') || lower.includes('수술') || lower.includes('진료')) {
    if (!lower.includes('사하') && !lower.includes('강서') && !lower.includes('부산진')) {
      return QUESTION_CARDS.EMERGENCY_TRIAGE
    }
  }

  // 1단계: 첫 질문 / 탐색 동의 시 케어 스타일 카드
  if (step === 1 && !lower.includes('소형') && !lower.includes('중형') && !lower.includes('대형') && !lower.includes('가위') && !lower.includes('스파') && !lower.includes('클리핑') && !lower.includes('노령')) {
    return QUESTION_CARDS.BEAUTY_STYLE
  }

  // 2단계: 서비스 스타일이 정해졌거나 언급되었을 때 -> 체급/견종 카드
  if (lower.includes('가위') || lower.includes('스파') || lower.includes('클리핑') || lower.includes('노령') || lower.includes('목욕')) {
    if (!lower.includes('소형') && !lower.includes('중형') && !lower.includes('대형') && !lower.includes('시니어')) {
      return QUESTION_CARDS.PET_SIZE
    }
  }

  // 3단계: 체급이 결정되었을 때 -> 보호자 우선순위 환경 카드
  if (lower.includes('소형') || lower.includes('중형') || lower.includes('대형') || lower.includes('시니어')) {
    if (!lower.includes('스트레스') && !lower.includes('쇼독') && !lower.includes('가성비') && !lower.includes('집중')) {
      return QUESTION_CARDS.PRIORITY_ENV
    }
  }

  return null
}
