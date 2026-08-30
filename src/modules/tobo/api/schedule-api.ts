/**
 * 📅 영업시간/임시휴무 API
 * SSOT v1.5 §11-10 반영
 * API 시그니처 명세서 §3 반영
 *
 * SSOT 8번 원칙: date_picker/time_slot 카드가 후보 날짜/시간을 계산하는
 * 모든 경로에서 반드시 isDateAvailable()을 거쳐야 함.
 * 이 함수를 우회해서 직접 DB 조회하는 코드는 SSOT 8번 위반.
 */

import { createClient } from '@/utils/supabase/client'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// ----------------------------------------------------------------
// 1. 날짜 가용 여부 확인 (§3)
// CARD_TEMPLATES의 date_picker, time_slot 카드에서 반드시 이 함수를 경유해야 함.
// ----------------------------------------------------------------
export async function isDateAvailable(
  businessId: string,
  date: string   // YYYY-MM-DD
): Promise<boolean> {
  const supabase = createClient()

  const { data: exception } = await supabase
    .from('business_schedule_exceptions')
    .select('is_closed')
    .eq('business_id', businessId)
    .eq('exception_date', date)
    .maybeSingle()

  // exception row 있고 is_closed=true면 false, 없으면 true
  if (exception?.is_closed === true) return false
  return true
}

// ----------------------------------------------------------------
// 2. 오늘 임시휴무 토글 (§3)
// 업체 대시보드 "오늘 임시휴무" 버튼에서 호출.
// upsert: row 있으면 is_closed 반전, 없으면 is_closed=true로 생성.
// ----------------------------------------------------------------
export async function toggleTodayClosure(
  businessId: string
): Promise<{ date: string; isClosed: boolean }> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  // 현재 상태 확인
  const { data: existing } = await supabase
    .from('business_schedule_exceptions')
    .select('id, is_closed')
    .eq('business_id', businessId)
    .eq('exception_date', today)
    .maybeSingle()

  const newIsClosed = existing ? !existing.is_closed : true

  if (existing) {
    await supabase
      .from('business_schedule_exceptions')
      .update({ is_closed: newIsClosed })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('business_schedule_exceptions')
      .insert({
        business_id: businessId,
        exception_date: today,
        is_closed: true,
      })
  }

  return { date: today, isClosed: newIsClosed }
}
