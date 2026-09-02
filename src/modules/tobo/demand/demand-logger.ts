// 📦 모듈 1: 미지원 수요 감지 및 트래킹 모듈 (Demand Logger)
import { SupabaseClient } from '@supabase/supabase-js'

export interface UnmetDemandItem {
  keyword: string
  categoryGuess: string
}

export const UNSUPPORTED_KEYWORDS: Array<{ kw: string; cat: string }> = [
  { kw: '펜션', cat: '숙박/펜션' },
  { kw: '호텔', cat: '숙박/호텔' },
  { kw: '풀빌라', cat: '숙박/풀빌라' },
  { kw: '캠핑', cat: '숙박/캠핑' },
  { kw: '글램핑', cat: '숙박/글램핑' },
  { kw: '병원', cat: '의료/동물병원' },
  { kw: '치과', cat: '의료/치과' },
  { kw: '한의원', cat: '의료/한의원' },
  { kw: '치킨', cat: '외식/치킨' },
  { kw: '고기', cat: '외식/고깃집' },
  { kw: '카페', cat: '외식/카페' },
  { kw: '렌트', cat: '교통/렌터카' }
]

export function detectUnmetDemand(message: string): UnmetDemandItem | null {
  const lower = message.toLowerCase()
  const matched = UNSUPPORTED_KEYWORDS.find(item => lower.includes(item.kw))
  if (!matched) return null
  return {
    keyword: matched.kw,
    categoryGuess: matched.cat
  }
}

export async function logUnmetDemand(
  admin: SupabaseClient,
  userId: string,
  sessionId: string | null,
  item: UnmetDemandItem,
  rawMessage: string
) {
  try {
    const { error } = await admin.from('tobo_unmet_demands').insert({
      user_id: userId,
      session_id: sessionId || null,
      keyword: item.keyword,
      category_guess: item.categoryGuess,
      user_note: rawMessage
    })
    if (error) {
      console.warn('⚠️ [Tobo Demand Module] 기록 실패:', error.message)
    } else {
      console.log(`📊 [Tobo Demand Module] 신규 수요 자산 적재: ${item.keyword} (${item.categoryGuess})`)
    }
  } catch (err: any) {
    console.warn('⚠️ [Tobo Demand Module] 에러:', err.message)
  }
}
