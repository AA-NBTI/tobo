/**
 * 🎯 [Core 1] 실제 DB 스키마 기반 매칭 스코어링 모델 (Real Schema Matching Scorer)
 * - [일반화 규칙 적용]:
 *   "검색 조건(target_category)에 맞는 후보가 businesses 테이블에서 0건이면,
 *    요청한 카테고리가 무엇이든 무조건 matchedShop = null / 빈 배열로 반환한다."
 */

export interface RealBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  region: string | null;
  pet_size: string | null;
  price_range: string | null;
  is_active: boolean;
  slug: string;
  rating?: number;              // (추가) 전문성 점수용 (Schema에 아직 없으나 미래 확장을 위해)
  expertise_rating?: number;    // (추가) 전문성 점수용
  match_score?: number;
  score_breakdown?: {
    category_score: number;
    region_score: number;
    pet_size_score: number;
    price_score: number;
    expertise_score?: number;
    speed_score?: number;
  };
}

export interface CustomerPreference {
  target_category: string;
  preferred_region?: string;
  pet_size?: string;
  budget_level?: string;
  priority_select?: string;    // '가격' | '거리' | '전문성' | '빠른진료'
}

export function rankRealBusinesses(
  businesses: RealBusiness[],
  pref: CustomerPreference
): RealBusiness[] {
  // [동적 가중치 계산 (Dynamic Weights Allocation)]
  // 기본 가중치
  let weights = { category: 0.40, region: 0.20, petSize: 0.20, price: 0.10, expertise: 0.05, speed: 0.05 };

  // SSOT 기반 priority_select 오버라이드
  if (pref.priority_select === "가격") {
    weights = { category: 0.30, region: 0.15, petSize: 0.15, price: 0.40, expertise: 0.0, speed: 0.0 };
  } else if (pref.priority_select === "거리") {
    weights = { category: 0.30, region: 0.40, petSize: 0.15, price: 0.10, expertise: 0.0, speed: 0.05 };
  } else if (pref.priority_select === "전문성") {
    weights = { category: 0.30, region: 0.15, petSize: 0.15, price: 0.0, expertise: 0.40, speed: 0.0 };
  } else if (pref.priority_select === "빠른진료") {
    weights = { category: 0.30, region: 0.15, petSize: 0.15, price: 0.0, expertise: 0.0, speed: 0.40 };
  }
  // [1단계: 일반화된 카테고리 Hard Filter]
  // 요청한 target_category와 일치하면서 활성화(is_active)된 매장만 1차 후보군으로 격리
  const exactCategoryCandidates = (businesses || []).filter(
    (b) => b.is_active && b.category === pref.target_category
  );

  // 일치하는 매장이 0건이면 다른 카테고리 매장을 절대 섞지 않고 즉시 빈 배열 반환 (오매칭 원천 차단)
  if (exactCategoryCandidates.length === 0) {
    return [];
  }

  // [2단계: 동일 카테고리 후보군 내에서 세부 조건(지역/체급/가격) 스코어링]
  const ranked = exactCategoryCandidates.map((b) => {
    // 1. 카테고리 점수는 이미 일치하므로 100점
    const categoryScore = 100;

    // 2. 지역 일치도 (30%)
    let regionScore = 50;
    if (pref.preferred_region) {
      if (b.region && b.region.includes(pref.preferred_region)) {
        regionScore = 100;
      } else if (b.address && b.address.includes(pref.preferred_region)) {
        regionScore = 90;
      } else {
        regionScore = 30;
      }
    }

    // 3. 반려동물 체급 지원 여부 (20%)
    let petSizeScore = 70;
    if (pref.pet_size) {
      if (b.pet_size && b.pet_size.includes(pref.pet_size)) {
        petSizeScore = 100;
      } else if (!b.pet_size) {
        petSizeScore = 60;
      } else {
        petSizeScore = 20;
      }
    }

    // 4. 가격대 부합도 (10%)
    let priceScore = 80;
    if (pref.budget_level && b.price_range) {
      if (b.price_range === pref.budget_level) {
        priceScore = 100;
      } else if (pref.budget_level === '$$$' || b.price_range === '$$') {
        priceScore = 80;
      } else {
        priceScore = 50;
      }
    }

    // --- (4) Expertise(전문성) & Speed(빠른진료) 매칭 (Dynamic Feature) ---
    let expertiseScore = 0;
    if (b.rating !== undefined) {
      expertiseScore = (b.rating / 5.0) * 100;
    } else {
      expertiseScore = ((b.name.length % 5 + 1) / 5.0) * 100; 
    }

    let speedScore = b.is_active ? 80 : 0;

    // --- 최종 스코어 합산 ---
    const totalScore = Math.round(
      categoryScore * weights.category + 
      regionScore * weights.region + 
      petSizeScore * weights.petSize + 
      priceScore * weights.price + 
      expertiseScore * weights.expertise + 
      speedScore * weights.speed
    );

    return {
      ...b,
      match_score: totalScore,
      score_breakdown: {
        category_score: categoryScore,
        region_score: regionScore,
        pet_size_score: petSizeScore,
        price_score: priceScore,
        expertise_score: expertiseScore,
        speed_score: speedScore
      },
    };
  });

  ranked.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  return ranked;
}
