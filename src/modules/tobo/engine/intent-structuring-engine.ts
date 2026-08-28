/**
 * 🗄️ [1단계] 데이터 구조화 엔진 (Data Structuring Engine)
 * - 하드코딩된 isSupported: true/false 플래그를 완전히 제거!
 * - 실제 활성 매장 목록(businesses) 또는 매장 수(activeCategoryCounts)를 주입받아 동적으로 지원 여부(isSupported)를 판정!
 */

export interface StructuredIntent {
  intentType: 'SUPPORTED_SERVICE' | 'UNMET_DEMAND' | 'GENERAL_GREETING';
  detectedDomain: string | null;
  isSupported: boolean;
  unmetDetail?: {
    category: string;
    label: string;
    reason: string;
  };
  extractedKeywords: string[];
}

export interface DomainCategoryConfig {
  domain: string;
  label: string;
  words: string[];
}

// 6대 핵심 업종 키워드 사전 (isSupported 플래그 없음! 순수 단어 매핑용)
export const DOMAIN_DICTIONARY: Record<string, DomainCategoryConfig> = {
  grooming: { domain: 'pet_grooming', label: '반려동물 미용/스파', words: ['미용', '가위컷', '목욕', '스파', '커트', '클리핑', '위생미용', '털'] },
  clinic: { domain: 'clinic', label: '동물병원/응급진료', words: ['병원', '진료', '응급', '24시', '수술', '다리', '슬개골', '외상', '아파', '피부'] },
  hotel: { domain: 'pet_hotel', label: '펫호텔/유치원 돌봄', words: ['호텔', '유치원', '맡겨', '출장', '돌봄', '1박'] },
  dining: { domain: 'pet_dining', label: '반려견 동반 식당/카페', words: ['식당', '카페', '브런치', '테라스', '밥', '동반식당', '음식점'] },
  pension: { domain: 'pet_pension', label: '반려동물 동반 펜션/풀빌라', words: ['펜션', '글램핑', '숙소', '독채', '풀빌라', '수영장'] },
  taxi: { domain: 'pet_taxi', label: '펫 전용 이동/택시 서비스', words: ['택시', '픽업', '태워', '이동'] },
  funeral: { domain: 'pet_funeral', label: '반려동물 안심 장례/추모 서비스', words: ['장례', '화장', '추모'] },
  training: { domain: 'pet_training', label: '전문 훈련사 행동교정/방문훈련', words: ['훈련', '행동교정', '짖음', '입질교정'] }
};

/**
 * 사용자 발화 의도 구조화 및 DB 매장 수 기반 동적 지원 여부 판정
 * @param message 사용자 입력 텍스트
 * @param activeBusinesses DB에서 조회된 활성 매장 목록 (선택적)
 */
export function structureUserIntent(
  message: string,
  activeBusinesses?: Array<{ category: string; is_active?: boolean }>
): StructuredIntent {
  const lower = (message || '').toLowerCase().trim();
  const matchedKeywords: string[] = [];

  // [0. "찾는 서비스가 없어요" / "기타" 클릭 시 최우선 처리]
  if (lower.includes('찾는 서비스가 없') || lower.includes('(기타)') || lower.includes('기타')) {
    return {
      intentType: 'UNMET_DEMAND',
      detectedDomain: 'custom_unmet',
      isSupported: false,
      unmetDetail: {
        category: 'custom_unmet',
        label: '맞춤 희망 서비스',
        reason: '현재 찾으시는 서비스는 제휴 준비 중입니다.'
      },
      extractedKeywords: ['기타', '신규서비스']
    };
  }

  let detectedCategoryKey: string | null = null;

  for (const [key, cfg] of Object.entries(DOMAIN_DICTIONARY)) {
    for (const w of cfg.words) {
      if (lower.includes(w)) {
        if (!matchedKeywords.includes(w)) {
          matchedKeywords.push(w);
        }
        if (!detectedCategoryKey) {
          detectedCategoryKey = key;
        }
      }
    }
  }

  if (!detectedCategoryKey) {
    return {
      intentType: 'GENERAL_GREETING',
      detectedDomain: null,
      isSupported: true,
      extractedKeywords: []
    };
  }

  const selected = DOMAIN_DICTIONARY[detectedCategoryKey];

  // 🏛️ [핵심 아키텍처]: isSupported를 코드 플래그로 결정하지 않고,
  // 주입받은 DB 매장 데이터(activeBusinesses) 중 해당 카테고리 활성 매장 수가 > 0 인지로 동적 판정!
  let isSupported = false;
  if (activeBusinesses && Array.isArray(activeBusinesses)) {
    const activeCount = activeBusinesses.filter(
      (b) => (b.is_active !== false) && b.category === selected.domain
    ).length;
    isSupported = (activeCount > 0);
  } else {
    // 기본값: DB 주입이 없는 순수 파싱일 경우 도메인 식별만 수행
    isSupported = false;
  }

  return {
    intentType: isSupported ? 'SUPPORTED_SERVICE' : 'UNMET_DEMAND',
    detectedDomain: selected.domain,
    isSupported: isSupported,
    unmetDetail: isSupported ? undefined : {
      category: selected.domain,
      label: selected.label,
      reason: `현재 ${selected.label} 예약 서비스는 제휴 준비 중입니다.`
    },
    extractedKeywords: matchedKeywords
  };
}
