/**
 * 🏥 예약 확정/취소/노쇼 기록 API
 * SSOT v1.5 §11-2(즉시확정, 30분 취소창), §11-4(노쇼 기록 전용)
 * API 시그니처 명세서 §1, §2 반영
 */

import { createClient } from '@/utils/supabase/client'

// ----------------------------------------------------------------
// 1. 예약 확정 (§1, api-spec §1)
// 전제: 호출 전 반드시 isDateAvailable() 통과 확인 (schedule-api.ts)
// ----------------------------------------------------------------
export async function confirmReservation(input: {
  businessId: string
  customerId: string
  serviceId: string        // business_services.id
  slotDateTime: string     // ISO 8601
}): Promise<
  | { reservationId: string; status: 'confirmed'; cancellableUntil: string }
  | { error: 'BUSINESS_CLOSED_ON_DATE' | 'SLOT_UNAVAILABLE' | 'SERVICE_NOT_FOUND' }
> {
  const supabase = createClient()
  const { businessId, customerId, serviceId, slotDateTime } = input

  // 서비스 존재 여부 확인
  const { data: service } = await supabase
    .from('business_services')
    .select('id, is_active')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .single()

  if (!service || !service.is_active) {
    return { error: 'SERVICE_NOT_FOUND' }
  }

  // 슬롯 가용 여부 확인 (임시휴무 테이블 체크)
  const slotDate = slotDateTime.split('T')[0]
  const { data: exception } = await supabase
    .from('business_schedule_exceptions')
    .select('is_closed')
    .eq('business_id', businessId)
    .eq('exception_date', slotDate)
    .single()

  if (exception?.is_closed) {
    return { error: 'BUSINESS_CLOSED_ON_DATE' }
  }

  // 예약 생성 (status='confirmed' 즉시확정 — pending 상태 없음, SSOT §11-2)
  const confirmedAt = new Date().toISOString()
  const cancellableUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      business_id: businessId,
      user_id: customerId,
      service_id: serviceId,
      reservation_time: slotDateTime,
      status: 'confirmed',
      confirmed_at: confirmedAt,
      cancellable_until: cancellableUntil,
      customer_name: '',   // 손님 이름은 별도 조회 또는 onboarding 단계에서 채움
    })
    .select('id')
    .single()

  if (error || !reservation) {
    return { error: 'SLOT_UNAVAILABLE' }
  }

  return {
    reservationId: reservation.id,
    status: 'confirmed',
    cancellableUntil,
  }
}

// ----------------------------------------------------------------
// 2. 업체 측 예약 취소 (30분 창 이내만 가능, §1)
// 손님 취소 경로는 파일럿 범위 밖 (SSOT §11-2)
// ----------------------------------------------------------------
export async function cancelWithinWindow(input: {
  reservationId: string
  businessId: string   // 취소 주체가 업체임을 강제
}): Promise<
  | { status: 'cancelled' }
  | { error: 'WINDOW_EXPIRED' | 'ALREADY_CANCELLED' | 'RESERVATION_NOT_FOUND' | 'BUSINESS_MISMATCH' }
> {
  const supabase = createClient()
  const { reservationId, businessId } = input

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, business_id, status, cancellable_until')
    .eq('id', reservationId)
    .single()

  if (!reservation) return { error: 'RESERVATION_NOT_FOUND' }

  // SSOT §8 원칙: 프롬프트 설득 아닌 코드 강제
  if (reservation.business_id !== businessId) return { error: 'BUSINESS_MISMATCH' }
  if (reservation.status === 'cancelled') return { error: 'ALREADY_CANCELLED' }

  // 30분 취소 창 검증 — 이 검증 없이 취소 처리되면 회귀 버그 (테스트 케이스 3번)
  if (new Date() > new Date(reservation.cancellable_until)) {
    return { error: 'WINDOW_EXPIRED' }
  }

  const { error } = await supabase
    .from('reservations')
    .update({
      status: 'cancelled',
      cancelled_by: 'business',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', reservationId)

  if (error) return { error: 'RESERVATION_NOT_FOUND' }

  return { status: 'cancelled' }
}

// ----------------------------------------------------------------
// 3. 노쇼 기록 (§2)
// 금지사항(§2): 페널티 부여, 계정 제한, 자동 알림 등 어떤 부수효과도 추가하지 말 것.
// no_show=true 필드 기록 외에는 아무 동작도 없어야 함.
// ----------------------------------------------------------------
export async function recordNoShow(input: {
  reservationId: string
  businessId: string
  recordedBy: string   // business 계정 id
}): Promise<
  | { status: 'recorded' }
  | { error: 'RESERVATION_NOT_FOUND' | 'BUSINESS_MISMATCH' | 'ALREADY_RECORDED' | 'FUTURE_RESERVATION' }
> {
  const supabase = createClient()
  const { reservationId, businessId, recordedBy } = input

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, business_id, reservation_time, no_show')
    .eq('id', reservationId)
    .single()

  if (!reservation) return { error: 'RESERVATION_NOT_FOUND' }
  if (reservation.business_id !== businessId) return { error: 'BUSINESS_MISMATCH' }
  if (reservation.no_show) return { error: 'ALREADY_RECORDED' }

  // 미래 예약에 노쇼 기록 시도 시 거부 (테스트 케이스 5번)
  if (new Date(reservation.reservation_time) > new Date()) {
    return { error: 'FUTURE_RESERVATION' }
  }

  // no_show=true 기록 외 어떤 부수효과도 없음 (§2 금지사항, 테스트 케이스 6번)
  const { error } = await supabase
    .from('reservations')
    .update({
      no_show: true,
      no_show_recorded_at: new Date().toISOString(),
      no_show_recorded_by: recordedBy,
    })
    .eq('id', reservationId)

  if (error) return { error: 'RESERVATION_NOT_FOUND' }

  return { status: 'recorded' }
}
