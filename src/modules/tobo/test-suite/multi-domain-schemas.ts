/**
 * 🏛️ 토보 AI 범용 확장 데이터 아키텍처: [범용 코어 15대 슬롯] + [업종별 특화 10대 슬롯] = 총 25대 슬롯
 */

// 1. 전 업종 공통 15대 범용 코어 슬롯 (Universal Core Slots)
export interface UniversalCoreSlots {
  // [A. 고객 기본 및 이동 동선 (Critical)]
  location_area: string;            // 01. 활동 거주지역/행정동 (예: 부산 사하구 하단동)
  mobility_type: string;            // 02. 이동수단 (자차 SUV / 대중교통 / 도보)
  parking_requirement: string;      // 03. 주차 공간 난이도 (지상 넓은 주차 / 초보운전 / 불필요)

  // [B. 라이프스타일 및 일정 (Core)]
  household_type: string;           // 04. 가구 형태 (1인가구 직장인 / 맞벌이 / 다인가구)
  preferred_schedule_time: string;  // 05. 가용 시간대 (평일 퇴근야간 19:00 / 주말 오후 등)
  owner_decision_priority: string;  // 06. 최종 의사결정 기준 (안전 최우선 / 가성비 / 전문성)

  // [C. 지출 및 소비 성향 (Core)]
  budget_limit_won: number;         // 07. 1회 지출 예산 한도 (원)
  price_sensitivity: string;        // 08. 가격 민감도 (가성비 중시 vs 프리미엄 VIP)

  // [D. 반려동물 기본 제원 (Critical)]
  pet_species: string;              // 09. 동물 종류 (반려견 / 반려묘 등)
  pet_breed: string;                // 10. 품종/견종 (비숑, 말티즈, 포메, 믹스 등)
  pet_age_years: number;            // 11. 연령 및 생애주기 (유견, 성견, 12세 시니어 노령견)
  pet_weight_kg: number;            // 12. 체급/체중 (소형 3kg, 중형 7kg, 대형 25kg)

  // [E. 사회성 및 성향 특이사항 (Critical)]
  social_temperament: string;       // 13. 사회성 및 낯가림 (온순함 / 낯가림 / 분리불안)
  aggression_risk: string;          // 14. 공격성 및 입질 위험 (입질 없음 / 겁먹으면 으르렁)
  care_isolation_need: string;      // 15. 1:1 단독 케어 필요성 (1인 단독 룸 필수 / 오픈형 가능)
}

// 2. 업종별 동적 특화 10대 슬롯 (Vertical Specific Slots)
export interface DomainVerticalSlots {
  domain_category: 'pet_grooming' | 'clinic' | 'pet_hotel' | 'pet_dining'; // 업종 구분
  slot_01_primary_service: string;       // 16. 주 희망 서비스 (가위컷 / 24시응급 / 1인호텔룸 / 동반식사)
  slot_02_special_symptom: string;       // 17. 건강/피모/증상 특이사항 (슬개골 3기 / 피부알러지 / 구토응급)
  slot_03_past_trauma: string;           // 18. 과거 트라우마/이력 (낙상공포 / 클리퍼공포 / 수술이력)
  slot_04_facility_facility_need: string;// 19. 시설/환경 필수요건 (미끄럼방지매트 / 24시간상주 / 야외운동장)
  slot_05_add_on_program: string;        // 20. 추가 부가 프로그램 (탄산스파 / 종합혈액검사 / CCTV확인)
  slot_06_hygiene_sanitation: string;    // 21. 위생/소독 수준 요구 (의료급 소독 / 청결도)
  slot_07_staff_expertise: string;       // 22. 담당자 전문성 기준 (쇼독 가위컷경력 / 외과전문의 / 훈련사)
  slot_08_notification_need: string;     // 23. 알림장 및 소통 방식 (실시간 사진/영상 전송 / 상세소견서)
  slot_09_emergency_protocol: string;    // 24. 비상시 대처 프로토콜 (연계병원 즉시이송 / 원장직접연락)
  slot_10_special_request: string;       // 25. 고객 특별 요청사항 (귀툭튀컷 / 약용샴푸 / 개별식단급여)
}

export interface MultiDomainPersonaConfig {
  id: string;
  domain: string;
  name: string;
  username: string;
  description: string;
  initialMessage: string;
  universalSlots: UniversalCoreSlots;
  domainSlots: DomainVerticalSlots;
}

// 7대 다업종(미용·병원·호텔·식당) 실전 페르소나
export const MULTI_DOMAIN_PERSONAS: MultiDomainPersonaConfig[] = [
  {
    id: 'P-01',
    domain: '애견미용 (Grooming)',
    name: 'P-01 [미용] 원샷형 프리미엄 가위컷 손님',
    username: 'bot_persona_p01',
    description: '모든 예약 조건을 첫 마디에 완벽하게 털어놓는 비숑 가위컷 보호자',
    initialMessage: '다음주 토요일 오후 3시에 5.2kg 비숑 가위컷 예약할게요. 하단동 매장 맞죠?',
    universalSlots: {
      location_area: '부산 사하구 하단동 (동아대 부근)',
      mobility_type: '자차 운전 (SUV)',
      parking_requirement: '지상 전용 주차장 필수',
      household_type: '맞벌이 가구',
      preferred_schedule_time: '토요일 15:00 고정',
      owner_decision_priority: '가위컷 완성도 및 스타일링',
      budget_limit_won: 90000,
      price_sensitivity: '품질 우선',
      pet_species: '강아지',
      pet_breed: '비숑 프리제',
      pet_age_years: 4,
      pet_weight_kg: 5.2,
      social_temperament: '온순하고 쾌활함',
      aggression_risk: '입질 전혀 없음',
      care_isolation_need: '오픈형 케어 가능'
    },
    domainSlots: {
      domain_category: 'pet_grooming',
      slot_01_primary_service: '전체 가위컷 & 위생 스타일링',
      slot_02_special_symptom: '귀 뒤쪽 약간 엉킴',
      slot_03_past_trauma: '트라우마 없음, 미용 잘 받음',
      slot_04_facility_facility_need: '쾌적한 대기 공간',
      slot_05_add_on_program: '얼굴 귀툭튀 컷 & 발톱 케어',
      slot_06_hygiene_sanitation: '위생 가위 소독 철저',
      slot_07_staff_expertise: '비숑 가위컷 전문 경력 원장',
      slot_08_notification_need: '미용 완료 후 알림 카톡',
      slot_09_emergency_protocol: '비상 연락망 유지',
      slot_10_special_request: '하이바 볼륨감 유지 요망'
    }
  },
  {
    id: 'P-02',
    domain: '동물병원 (Clinic)',
    name: 'P-02 [병원/응급] 24시 야간 슬개골/심장 응급 손님',
    username: 'bot_persona_p02',
    description: '야간에 강아지가 다리를 절며 앓는 소리를 내어 급히 24시 병원을 찾는 손님',
    initialMessage: '강아지가 방금 침대에서 떨어져서 다리를 못 딛고 낑낑대는데 지금 바로 진료 가능한 사하구 쪽 병원 있나요?',
    universalSlots: {
      location_area: '부산 사하구 당리동/하단동',
      mobility_type: '자차 이동 (응급)',
      parking_requirement: '병원 바로 앞 응급 정차 가능',
      household_type: '1인 가구',
      preferred_schedule_time: '지금 즉시 (야간 응급)',
      owner_decision_priority: '야간 즉시 수술/진료 가능 여부',
      budget_limit_won: 300000,
      price_sensitivity: '비용 무관, 즉시 응급 처치 최우선',
      pet_species: '강아지',
      pet_breed: '포메라니안',
      pet_age_years: 5,
      pet_weight_kg: 3.1,
      social_temperament: '통증으로 극도로 불안함',
      aggression_risk: '만지면 아파서 입질 반응 가능',
      care_isolation_need: '응급 처치실 단독 격리'
    },
    domainSlots: {
      domain_category: 'clinic',
      slot_01_primary_service: '24시 야간 외상 응급 진료 & X-ray',
      slot_02_special_symptom: '우측 뒷다리 체중 부하 불가 (탈구/골절 의심)',
      slot_03_past_trauma: '기존 슬개골 탈구 2기 진단 이력',
      slot_04_facility_facility_need: '디지털 X-ray 및 정형외과 수술실',
      slot_05_add_on_program: '진통 소염 주사 및 관절 깁스 처치',
      slot_06_hygiene_sanitation: '무균 수술실 환경',
      slot_07_staff_expertise: '정형외과 전공 수의사 상주',
      slot_08_notification_need: '검사 직후 X-ray 사진 브리핑',
      slot_09_emergency_protocol: '야간 당직 수의사 1:1 집중 케어',
      slot_10_special_request: '과잉 진료 없이 뼈 상태 정확 검진'
    }
  },
  {
    id: 'P-03',
    domain: '펫호텔/유치원 (Hotel)',
    name: 'P-03 [호텔] 출장 중 1인 단독룸 3박 4일 케어 손님',
    username: 'bot_persona_p03',
    description: '서울 출장으로 3박 4일 동안 강아지를 안전하게 맡기려는 직장인 보호자',
    initialMessage: '다음주 수요일부터 토요일까지 3박 4일 맡겨야 하는데, 다른 개랑 안 섞이고 24시간 사람 있는 1인 단독 호텔 있을까요?',
    universalSlots: {
      location_area: '부산 사하구 하단동 (김해공항 이동 동선)',
      mobility_type: '자차 운전 (공항 가기 전 드롭)',
      parking_requirement: '매장 앞 10분 정차/주차 가능',
      household_type: '1인 가구 직장인',
      preferred_schedule_time: '수요일 오전 08:30 입실',
      owner_decision_priority: '24시간 직원 상주 및 실시간 CCTV',
      budget_limit_won: 200000,
      price_sensitivity: '안전 보장이면 프리미엄 지불 의사 있음',
      pet_species: '강아지',
      pet_breed: '푸들',
      pet_age_years: 3,
      pet_weight_kg: 4.5,
      social_temperament: '분리불안 약간 있음, 낯선 개 경계',
      aggression_risk: '입질 없음',
      care_isolation_need: '1인 단독 프리미엄 룸 필수'
    },
    domainSlots: {
      domain_category: 'pet_hotel',
      slot_01_primary_service: '프리미엄 1인 단독 룸 3박 4일 호텔링',
      slot_02_special_symptom: '낯선 사료 거부 (전용 사료 지참)',
      slot_03_past_trauma: '단체 케어 샵에서 물림 사고 목격 트라우마',
      slot_04_facility_facility_need: '개별 난방/냉방 및 방음 단독 룸',
      slot_05_add_on_program: '단독 실내 플레이 타임 & 노즈워크',
      slot_06_hygiene_sanitation: '매일 퇴실 후 자외선 룸 소독',
      slot_07_staff_expertise: '반려동물행동교정사 자격 보유 스태프',
      slot_08_notification_need: '하루 3회 식사/배변/놀이 영상 전송',
      slot_09_emergency_protocol: '야간 이상 징후 시 연계 24시 병원 즉시 이송',
      slot_10_special_request: '퇴실 당일 탄산스파 목욕 후 픽업 희망'
    }
  },
  {
    id: 'P-04',
    domain: '동반식당/카페 (Dining)',
    name: 'P-04 [식당] 주말 브런치 야외 테라스 동반 손님',
    username: 'bot_persona_p04',
    description: '주말에 반려견과 함께 편안하게 식사할 수 있는 전용 주차 완비 식당을 찾는 손님',
    initialMessage: '이번주 일요일 점심에 대형견 데리고 식사할 수 있는 곳 있나요? 주차 편하고 테라스 있는 곳이면 좋겠어요.',
    universalSlots: {
      location_area: '부산 사하구 을숙도/명지 부근',
      mobility_type: '자차 SUV',
      parking_requirement: '대형 주차장 필수 (SUV 주차 편의)',
      household_type: '커플/신혼부부',
      preferred_schedule_time: '일요일 12:30 점심',
      owner_decision_priority: '대형견 출입 가능 및 야외 펜스 안전',
      budget_limit_won: 60000,
      price_sensitivity: '적정 외식가',
      pet_species: '강아지',
      pet_breed: '골든 리트리버',
      pet_age_years: 2,
      pet_weight_kg: 28.0,
      social_temperament: '매우 활발하고 사람을 좋아함',
      aggression_risk: '입질 없음, 대형견 덩치 큼',
      care_isolation_need: '넓은 야외 좌석 간격 희망'
    },
    domainSlots: {
      domain_category: 'pet_dining',
      slot_01_primary_service: '반려견 동반 이탈리안 레스토랑 & 브런치',
      slot_02_special_symptom: '닭고기 알러지 있음',
      slot_03_past_trauma: '좁은 실내에서 리드줄 엉킴 불편 이력',
      slot_04_facility_facility_need: '천연잔디 야외 테라스 & 안전 펜스',
      slot_05_add_on_program: '수제 펫 푸드 (소고기 멍스테이크)',
      slot_06_hygiene_sanitation: '개별 물그릇 및 배변봉투 제공',
      slot_07_staff_expertise: '대형견 친화적 매장 직원 응대',
      slot_08_notification_need: '예약 확정 시 테라스 좌석 선점 알림',
      slot_09_emergency_protocol: '돌발 이탈 방지 이중문 완비',
      slot_10_special_request: '리드줄 고정용 테이블 앵커 구비'
    }
  },
  {
    id: 'P-05',
    domain: '애견미용 (Grooming)',
    name: 'P-05 [미용/정정] 변덕형 슬롯 덮어쓰기 손님',
    username: 'bot_persona_p05',
    description: '목욕에서 스파 가위컷으로 중간에 조건을 정정하는 손님',
    initialMessage: '내일 오후에 강아지 기본 목욕만 예약할 수 있나요?',
    universalSlots: {
      location_area: '부산 사하구 괴정동',
      mobility_type: '자차 이동',
      parking_requirement: '주차 가능 매장',
      household_type: '신혼 부부',
      preferred_schedule_time: '내일 14:00 (오후)',
      owner_decision_priority: '정정된 가위컷 요구 반영력',
      budget_limit_won: 85000,
      price_sensitivity: '합리적 가격',
      pet_species: '강아지',
      pet_breed: '시츄',
      pet_age_years: 7,
      pet_weight_kg: 6.0,
      social_temperament: '순하고 차분함',
      aggression_risk: '입질 없음',
      care_isolation_need: '안정적 목욕 환경'
    },
    domainSlots: {
      domain_category: 'pet_grooming',
      slot_01_primary_service: '전체 가위컷 & 탄산스파 (목욕에서 변경)',
      slot_02_special_symptom: '지루성 피부 및 전신 털 엉킴',
      slot_03_past_trauma: '목욕 거품 눈에 들어간 트라우마',
      slot_04_facility_facility_need: '미끄럼 방지 욕조',
      slot_05_add_on_program: '눈가 위생 컷 및 귀 세정',
      slot_06_hygiene_sanitation: '저자극 천연 샴푸 사용',
      slot_07_staff_expertise: '시츄 스타일링 전문',
      slot_08_notification_need: '완료 15분 전 전화 안내',
      slot_09_emergency_protocol: '피부 자극 시 즉시 린스',
      slot_10_special_request: '얼굴 동글동글하게 컷트'
    }
  },
  {
    id: 'P-06',
    domain: '애견미용/케어 (Grooming)',
    name: 'P-06 [미용/노령견] 12살 노령견 슬개골 1인 전담 케어',
    username: 'bot_persona_p06',
    description: '12살 노령견, 슬개골 3기, 아토피로 1인 단독 안심 케어가 필수인 손님',
    initialMessage: '저희 애가 12살 노령견이고 피부도 빨갛고 슬개골이 안 좋은데, 안전하게 1인 전담 케어 해주는 곳 있을까요?',
    universalSlots: {
      location_area: '부산 사하구 하단동 (하단역 1번 출구 부근)',
      mobility_type: '자차 운전 (노령견 이동 최소화)',
      parking_requirement: '매장 바로 앞 주차 필수',
      household_type: '반려견 중심 가구',
      preferred_schedule_time: '오전 11:00 (컨디션 좋은 시간)',
      owner_decision_priority: '노령견 전문 경력 및 안전 프로토콜',
      budget_limit_won: 120000,
      price_sensitivity: '비용 무관, 안전 최우선',
      pet_species: '강아지',
      pet_breed: '말티즈 (시니어)',
      pet_age_years: 12,
      pet_weight_kg: 2.8,
      social_temperament: '겁이 많고 낯선 환경에 긴장',
      aggression_risk: '겁먹으면 방어적 으르렁',
      care_isolation_need: '완전 1:1 단독 예약제 (타 견 접촉 불가)'
    },
    domainSlots: {
      domain_category: 'pet_grooming',
      slot_01_primary_service: '노령견 안심 저자극 스파 & 위생 미용',
      slot_02_special_symptom: '양측 슬개골 탈구 3기 & 피부 붉은 반점',
      slot_03_past_trauma: '과거 낙상 사고 트라우마',
      slot_04_facility_facility_need: '초저상 전동 테이블 & 푹신한 매트',
      slot_05_add_on_program: '중간 휴식 시간 포함 미용 & 약용 스파',
      slot_06_hygiene_sanitation: '무자극 소독 및 타월 1견 1사용',
      slot_07_staff_expertise: '노령견 전문 케어 10년 이상 원장',
      slot_08_notification_need: '진행 상황 중간 사진 전송',
      slot_09_emergency_protocol: '응급시 즉시 하단동물의료센터 이송',
      slot_10_special_request: '오래 서있지 않게 눕혀서 미용 진행'
    }
  },
  {
    id: 'P-07',
    domain: '복합문화 (Multi)',
    name: 'P-07 [오타/은어] MZ 보호자의 빠른 미용/카페 탐색',
    username: 'bot_persona_p07',
    description: '은어와 오타가 섞인 문장을 던져 토보의 자연어 정규화 및 카테고리 분별력을 테스트하는 손님',
    initialMessage: '낼 3시데 되나여 강쥐 위생미용할건뎅 하단쪽 매장 ㅊㅊ좀',
    universalSlots: {
      location_area: '부산 사하구 하단동',
      mobility_type: '도보 이동',
      parking_requirement: '도보권',
      household_type: '1인 청년 가구',
      preferred_schedule_time: '내일 15:00 (오후 3시)',
      owner_decision_priority: '빠른 예약 및 친절한 소통',
      budget_limit_won: 45000,
      price_sensitivity: '가성비 및 이벤트 중시',
      pet_species: '강아지',
      pet_breed: '요크셔 테리어',
      pet_age_years: 2,
      pet_weight_kg: 2.5,
      social_temperament: '호기심 많고 활발함',
      aggression_risk: '입질 없음',
      care_isolation_need: '친절하고 빠른 미용'
    },
    domainSlots: {
      domain_category: 'pet_grooming',
      slot_01_primary_service: '기본 위생 미용 & 곰돌이컷',
      slot_02_special_symptom: '털 엉킴 없음, 건강함',
      slot_03_past_trauma: '첫 미용이라 낯설어함',
      slot_04_facility_facility_need: '밝고 개방적인 공간',
      slot_05_add_on_program: '스마트 알림장 사진 전송',
      slot_06_hygiene_sanitation: '깨끗한 미용 도구',
      slot_07_staff_expertise: '젊고 트렌디한 스타일링',
      slot_08_notification_need: '인스타 감성 사진 전송',
      slot_09_emergency_protocol: '기본 응급처치 키트 구비',
      slot_10_special_request: '사진 예쁘게 찍어주세요'
    }
  }
];
