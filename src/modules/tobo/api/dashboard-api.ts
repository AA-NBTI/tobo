/**
 * 📊 업체 대시보드 API
 * SSOT v1.5 §11-5, §12-1 연동
 * API 시그니처 명세서 §5, §6 반영
 *
 * 파일럿 범위 명시적 제외(§5): 매출 통계·재방문 분석 필드 없음.
 * 자체 판단으로 확장하지 말 것(테스트 케이스 8번).
 */

import { createClient } from '@/utils/supabase/client'

// ----------------------------------------------------------------
// 타입 정의
// ----------------------------------------------------------------
export type ReservationSummary = {
  reservationId: string
  customerLabel: string       // 손님 식별 표시 (전화번호 마스킹 등 — 12-1 연동 주의)
  serviceName: string
  slotDateTime: string
  status: 'confirmed' | 'cancelled'
  noShow: boolean
  notes: string[]             // customer_notes.note_text 목록
}

// ----------------------------------------------------------------
// 1. 업체 대시보드 조회 (§5)
// 최소화면: 오늘/이번주 예약 + 손님메모만 (SSOT §11-5)
// ----------------------------------------------------------------
export async function getBusinessDashboard(businessId: string): Promise<{
  reservationsToday: ReservationSummary[]
  reservationsThisWeek: ReservationSummary[]
}> {
  const supabase = createClient()

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
  const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString()

  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      id,
      user_id,
      service_id,
      reservation_time,
      status,
      no_show,
      business_services (service_name),
      accounts (display_name)
    `)
    .eq('business_id', businessId)
    .gte('reservation_time', todayStart)
    .lt('reservation_time', weekEnd)
    .order('reservation_time', { ascending: true })

  if (!reservations) return { reservationsToday: [], reservationsThisWeek: [] }

  // 손님 메모 일괄 조회
  const customerIds = [...new Set(reservations.map(r => r.user_id).filter(Boolean))]
  const { data: noteRows } = await supabase
    .from('customer_notes')
    .select('customer_id, note_text')
    .eq('business_id', businessId)
    .in('customer_id', customerIds)

  const notesByCustomer: Record<string, string[]> = {}
  for (const note of noteRows || []) {
    if (!notesByCustomer[note.customer_id]) notesByCustomer[note.customer_id] = []
    notesByCustomer[note.customer_id].push(note.note_text)
  }

  const toSummary = (r: any): ReservationSummary => ({
    reservationId: r.id,
    customerLabel: r.accounts?.display_name || '손님',  // 12-1: 마스킹 정책은 대표 확인 필요
    serviceName: r.business_services?.service_name || '서비스',
    slotDateTime: r.reservation_time,
    status: r.status as 'confirmed' | 'cancelled',
    noShow: r.no_show,
    notes: notesByCustomer[r.user_id] || [],
  })

  const reservationsToday = reservations
    .filter(r => r.reservation_time >= todayStart && r.reservation_time < todayEnd)
    .map(toSummary)

  const reservationsThisWeek = reservations.map(toSummary)

  // 파일럿 범위 초과 방지: 이 응답에 매출/재방문 통계 필드가 없어야 함 (테스트 케이스 8번)
  return { reservationsToday, reservationsThisWeek }
}

// ----------------------------------------------------------------
// 2. 손님 메모 추가 (§6)
// source='ai_extracted': RAG 대화 처리에서 알러지/특이사항 감지 시 자동 호출
// source='owner_manual': 사장님 직접 입력
// 주의(§4, 12-1): 민감정보(알러지 등) 포함 가능 — 보관기간/삭제정책은 대표 확인 필요
// ----------------------------------------------------------------
export async function addCustomerNote(input: {
  businessId: string
  customerId: string           // user_id로 통일 (승인 #3)
  noteText: string
  source: 'ai_extracted' | 'owner_manual'
}): Promise<{ noteId: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('customer_notes')
    .insert({
      business_id: input.businessId,
      customer_id: input.customerId,
      note_text: input.noteText,
      source: input.source,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('메모 저장 실패')

  return { noteId: data.id }
}

// ----------------------------------------------------------------
// 3. 손님 메모 조회 (§6)
// ----------------------------------------------------------------
export async function getCustomerNotes(
  businessId: string,
  customerId: string
): Promise<string[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('customer_notes')
    .select('note_text')
    .eq('business_id', businessId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  return (data || []).map(n => n.note_text)
}
