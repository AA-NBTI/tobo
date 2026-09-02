// 📦 모듈 3: 추천 기준 트리 매칭 모듈 (Criteria Matcher)

export interface ShopItem {
  id: string
  name: string
  category: string
  address?: string
  slug: string
  description?: string
  services?: Array<{ id: string; name: string; price: number; duration_minutes: number }>
  criteriaBadge?: string
  priorityOrder?: number
}

export function matchCriteriaShops(businesses: any[], userMessage: string, step: number): ShopItem[] {
  const lower = userMessage.toLowerCase()

  // 1. 응급 동물병원 매칭: 위치(사하/하단/명지) 또는 응급 키워드 선택 시 즉시 1순위 매칭
  if (lower.includes('병원') || lower.includes('24시') || lower.includes('사하구') || lower.includes('응급')) {
    const hospital = businesses.find(b => b.category === 'clinic' || b.name.includes('동물의료') || b.name.includes('병원'))
    if (hospital) {
      return [{
        id: hospital.id,
        name: hospital.name,
        category: 'clinic',
        address: hospital.address,
        slug: hospital.slug,
        description: hospital.description,
        services: (hospital.services || []).slice(0, 2),
        criteriaBadge: '24시응급우선',
        priorityOrder: 1
      }]
    }
  }

  // 2회 이상 질의응답이 진행되었거나 특정 키워드가 완성되었을 때만 매칭 수행
  const isReady = (step >= 2 && (lower.includes('우선') || lower.includes('필수') || lower.includes('스타일') || lower.includes('케어'))) || step >= 3

  if (!isReady) return []

  return (businesses || []).map(b => {
    let badge = '추천'
    let priorityOrder = 99

    if (b.name.includes('뽀송펫')) {
      badge = '주차우선'
      if (lower.includes('대형') || lower.includes('스파') || lower.includes('목욕') || lower.includes('주차')) priorityOrder = 1
    } else if (b.name.includes('해피퍼피')) {
      badge = '노령견안전우선'
      if (lower.includes('노령') || lower.includes('시니어') || lower.includes('안전') || lower.includes('관절')) priorityOrder = 1
    } else if (b.name.includes('프리미엄 독스타')) {
      badge = '전문성우선'
      if (lower.includes('쇼독') || lower.includes('디자인') || lower.includes('비숑') || lower.includes('최고급')) priorityOrder = 1
    } else if (b.name.includes('댕댕쌀롱')) {
      badge = '가격우선'
      if (lower.includes('가성비') || lower.includes('클리핑') || lower.includes('3mm') || lower.includes('빠른')) priorityOrder = 1
    } else if (b.name.includes('멍멍가위')) {
      badge = '1인케어우선'
      if (lower.includes('가위') || lower.includes('소형') || lower.includes('스트레스') || lower.includes('1인')) priorityOrder = 1
    }

    return {
      id: b.id,
      name: b.name,
      category: b.category,
      address: b.address,
      slug: b.slug,
      description: b.description,
      services: (b.services || []).slice(0, 2),
      criteriaBadge: badge,
      priorityOrder
    }
  }).sort((a, b) => (a.priorityOrder || 99) - (b.priorityOrder || 99))
}
