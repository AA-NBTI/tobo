/**
 * 🎯 [Core 1] 실제 DB 스키마 기반 매칭 스코어링 모델 (Real Schema Matching Scorer)
 * - [일반화 규칙 적용]:
 *   "검색 조건(target_category)에 맞는 후보가 businesses 테이블에서 0건이면,
 *    요청한 카테고리가 무엇이든 무조건 matchedShop = null / 빈 배열로 반환한다."
 */

function rankRealBusinesses(
  businesses,
  pref,
  weights = { category: 0.40, region: 0.30, petSize: 0.20, price: 0.10 }
) {
  // [1단계: 일반화된 카테고리 Hard Filter]
  const exactCategoryCandidates = (businesses || []).filter(
    (b) => b.is_active && b.category === pref.target_category
  );

  if (exactCategoryCandidates.length === 0) {
    return [];
  }

  // [2단계: 동일 카테고리 후보군 내에서 세부 조건(지역/체급/가격) 스코어링]
  const ranked = exactCategoryCandidates.map((b) => {
    const categoryScore = 100;

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

    const totalMatchScore = Math.round(
      categoryScore * weights.category +
      regionScore * weights.region +
      petSizeScore * weights.petSize +
      priceScore * weights.price
    );

    return {
      ...b,
      match_score: totalMatchScore,
      score_breakdown: {
        category_score: categoryScore,
        region_score: regionScore,
        pet_size_score: petSizeScore,
        price_score: priceScore
      }
    };
  });

  ranked.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  return ranked;
}

module.exports = { rankRealBusinesses };
