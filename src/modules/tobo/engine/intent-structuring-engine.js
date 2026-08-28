/**
 * 🗄️ [1단계] 데이터 구조화 엔진 (Data Structuring Engine - Pure JS for Universal Runtime)
 */

const DOMAIN_DICTIONARY = {
  grooming: { domain: 'pet_grooming', label: '반려동물 미용/스파', words: ['미용', '가위컷', '목욕', '스파', '커트', '클리핑', '위생미용', '털'] },
  clinic: { domain: 'clinic', label: '동물병원/응급진료', words: ['병원', '진료', '응급', '24시', '수술', '다리', '슬개골', '외상', '아파', '피부'] },
  hotel: { domain: 'pet_hotel', label: '펫호텔/유치원 돌봄', words: ['호텔', '유치원', '맡겨', '출장', '돌봄', '1박'] },
  dining: { domain: 'pet_dining', label: '반려견 동반 식당/카페', words: ['식당', '카페', '브런치', '테라스', '밥', '동반식당', '음식점'] },
  pension: { domain: 'pet_pension', label: '반려동물 동반 펜션/풀빌라', words: ['펜션', '글램핑', '숙소', '독채', '풀빌라', '수영장'] },
  taxi: { domain: 'pet_taxi', label: '펫 전용 이동/택시 서비스', words: ['택시', '픽업', '태워', '이동'] },
  funeral: { domain: 'pet_funeral', label: '반려동물 안심 장례/추모 서비스', words: ['장례', '화장', '추모'] },
  training: { domain: 'pet_training', label: '전문 훈련사 행동교정/방문훈련', words: ['훈련', '행동교정', '짖음', '입질교정'] }
};

function structureUserIntent(message, activeBusinesses) {
  const lower = (message || '').toLowerCase().trim();
  const matchedKeywords = [];

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

  let detectedCategoryKey = null;

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

  let isSupported = false;
  if (activeBusinesses && Array.isArray(activeBusinesses)) {
    const activeCount = activeBusinesses.filter(
      (b) => (b.is_active !== false) && b.category === selected.domain
    ).length;
    isSupported = (activeCount > 0);
  } else {
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

module.exports = { DOMAIN_DICTIONARY, structureUserIntent };
