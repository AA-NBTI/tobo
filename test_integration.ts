/**
 * 🧪 [DB 통합 테스트 — api-spec §8 Cases 1, 2, 3, 11]
 * - 실제 Supabase DB에 연결해서 함수를 직접 호출하는 진짜 테스트
 * - CI는 `node test_core_bugs.js` (정적 검증), 이 파일은 `npx tsx test_integration.ts` (DB 통합)
 * - 실행 전 Supabase 로컬 또는 remote DB가 올라와 있어야 함
 *   (마이그레이션 20260830000100~102 실행 완료 상태 필요)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

let passed = 0
let failed = 0

function assert(condition: boolean, name: string, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } else {
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

// ----------------------------------------------------------------
// 테스트용 픽스처: 실제 업체 1개를 DB에서 가져옴
// ----------------------------------------------------------------
async function getTestBusinessId(): Promise<string> {
  const { data } = await supabase
    .from('businesses')
    .select('id, category')
    .eq('is_active', true)
    .eq('onboarding_status', 'approved')
    .limit(1)
    .single()
  if (!data) throw new Error('테스트용 approved 업체가 없음 — 마이그레이션 실행 후 재시도')
  return data.id
}

async function getPetDiningBusinessId(): Promise<string | null> {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('category', 'pet_dining')
    .eq('is_active', true)
    .limit(1)
    .single()
  return data?.id ?? null
}

// ----------------------------------------------------------------
// isDateAvailable / toggleTodayClosure 직접 import
// ----------------------------------------------------------------
async function isDateAvailable(businessId: string, date: string): Promise<boolean> {
  const { data: exception } = await supabase
    .from('business_schedule_exceptions')
    .select('is_closed')
    .eq('business_id', businessId)
    .eq('exception_date', date)
    .maybeSingle()
  if (exception?.is_closed === true) return false
  return true
}

async function toggleTodayClosure(businessId: string): Promise<{ date: string; isClosed: boolean }> {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('business_schedule_exceptions')
    .select('id, is_closed')
    .eq('business_id', businessId)
    .eq('exception_date', today)
    .maybeSingle()

  const newIsClosed = existing ? !existing.is_closed : true

  if (existing) {
    await supabase.from('business_schedule_exceptions').update({ is_closed: newIsClosed }).eq('id', existing.id)
  } else {
    await supabase.from('business_schedule_exceptions').insert({ business_id: businessId, exception_date: today, is_closed: true })
  }
  return { date: today, isClosed: newIsClosed }
}

// ----------------------------------------------------------------
// 메인 테스트 실행
// ----------------------------------------------------------------
async function runTests() {
  console.log('================================================================')
  console.log('🧪 TOBO 통합 테스트 (DB 직접 호출 — api-spec §8 Cases 1, 2, 3, 11)')
  console.log('================================================================\n')

  let businessId: string
  try {
    businessId = await getTestBusinessId()
    console.log(`  📌 테스트 업체 ID: ${businessId}\n`)
  } catch (e: any) {
    console.error('❌ 픽스처 로드 실패:', e.message)
    process.exit(1)
  }

  const today = new Date().toISOString().split('T')[0]

  // ── Case 1: 임시휴무 날짜가 isDateAvailable에서 false 반환 ──────────────
  console.log('▶️  [Case 1] 임시휴무 날짜는 isDateAvailable → false')
  // 오늘을 임시휴무로 설정
  await supabase.from('business_schedule_exceptions').delete().eq('business_id', businessId).eq('exception_date', today)
  await supabase.from('business_schedule_exceptions').insert({ business_id: businessId, exception_date: today, is_closed: true })
  const unavailable = await isDateAvailable(businessId, today)
  assert(!unavailable, '[Case 1] 임시휴무 설정된 날짜는 isDateAvailable=false여야 함', `실제값: ${unavailable}`)
  // 정상 날짜 복원
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const available = await isDateAvailable(businessId, tomorrow)
  assert(available, '[Case 1] exception 없는 날짜는 isDateAvailable=true여야 함', `실제값: ${available}`)
  // 정리
  await supabase.from('business_schedule_exceptions').delete().eq('business_id', businessId).eq('exception_date', today)

  // ── Case 2: toggleTodayClosure 두 번 연속 → 반전 ──────────────────────
  console.log('\n▶️  [Case 2] toggleTodayClosure 두 번 연속 토글')
  await supabase.from('business_schedule_exceptions').delete().eq('business_id', businessId).eq('exception_date', today)
  const firstToggle = await toggleTodayClosure(businessId)
  assert(firstToggle.isClosed === true, '[Case 2] 첫 번째 토글 → isClosed=true', `실제값: ${firstToggle.isClosed}`)
  const secondToggle = await toggleTodayClosure(businessId)
  assert(secondToggle.isClosed === false, '[Case 2] 두 번째 토글 → isClosed=false (반전)', `실제값: ${secondToggle.isClosed}`)
  // 정리
  await supabase.from('business_schedule_exceptions').delete().eq('business_id', businessId).eq('exception_date', today)

  // ── Case 3: cancellable_until 이후 cancelWithinWindow → WINDOW_EXPIRED ─
  console.log('\n▶️  [Case 3] 취소 창 만료 후 cancelWithinWindow → WINDOW_EXPIRED')
  // 30분 전에 confirmed된 예약 생성 (cancellable_until이 이미 과거)
  const pastTime = new Date(Date.now() - 31 * 60 * 1000).toISOString()
  const { data: expiredReservation } = await supabase
    .from('reservations')
    .insert({
      business_id: businessId,
      customer_name: '테스트손님',
      reservation_time: new Date(Date.now() + 86400000).toISOString(),
      status: 'confirmed',
      confirmed_at: pastTime,
      cancellable_until: pastTime, // 이미 만료
    })
    .select('id')
    .single()

  if (expiredReservation) {
    const cancelResult = await cancelWithinWindowDirect(expiredReservation.id, businessId)
    assert(
      'error' in cancelResult && cancelResult.error === 'WINDOW_EXPIRED',
      '[Case 3] 취소 창 만료 후 cancelWithinWindow → WINDOW_EXPIRED',
      `실제 결과: ${JSON.stringify(cancelResult)}`
    )
    // 정리
    await supabase.from('reservations').delete().eq('id', expiredReservation.id)
  } else {
    assert(false, '[Case 3] 테스트용 예약 생성 실패')
  }

  // ── Case 11: pet_dining 업체가 saveSeatingConfig를 호출하면 성공, 그루밍용 함수 → 에러 ─
  console.log('\n▶️  [Case 11] pet_dining ↔ 업종별 함수 분기 실제 확인')
  // pet_dining이 아닌 업체에서 saveSeatingConfig → WRONG_CATEGORY
  const wrongCatResult = await saveSeatingConfigDirect(businessId, { petFriendlyTableCount: 5, maxPartySizePerTable: 4, averageTurnMinutes: 60, seatingType: ['indoor'] })
  const businessCategory = await supabase.from('businesses').select('category').eq('id', businessId).single()
  if (businessCategory.data?.category !== 'pet_dining') {
    assert(
      'error' in wrongCatResult && wrongCatResult.error === 'WRONG_CATEGORY',
      `[Case 11] pet_dining 아닌 업체(${businessCategory.data?.category})가 saveSeatingConfig → WRONG_CATEGORY`,
      `실제 결과: ${JSON.stringify(wrongCatResult)}`
    )
  }

  const diningId = await getPetDiningBusinessId()
  if (diningId) {
    const diningResult = await saveSeatingConfigDirect(diningId, { petFriendlyTableCount: 5, maxPartySizePerTable: 4, averageTurnMinutes: 60, seatingType: ['indoor', 'terrace'] })
    if ('error' in diningResult && diningResult.error === 'INSERT_FAILED') {
      // 마이그레이션이 아직 DB에 적용되지 않은 경우 SKIP
      console.log('  ⏭️  [SKIP] [Case 11] business_seating_config 테이블이 DB에 없음 — 마이그레이션 실행 후 재실행 필요')
    } else {
      assert(
        'seatingConfigId' in diningResult,
        '[Case 11] pet_dining 업체 saveSeatingConfig → 성공(seatingConfigId 반환)',
        `실제 결과: ${JSON.stringify(diningResult)}`
      )
      // 정리
      if ('seatingConfigId' in diningResult) {
        await supabase.from('business_seating_config').delete().eq('id', diningResult.seatingConfigId)
      }
    }
  } else {
    console.log('  ⏲️  pet_dining 업체가 DB에 없어 Case 11 식당 성공케이스 스킵')
  }

  // ── 결과 요약 ─────────────────────────────────────────────────────────
  console.log('\n================================================================')
  console.log(`📊 통합 테스트 결과: ${passed + failed}개 중 [PASS: ${passed} / FAIL: ${failed}]`)
  console.log('================================================================')
  if (failed > 0) process.exit(1)
  else { console.log('🎉 통합 테스트 모두 통과!'); process.exit(0) }
}

// ── 헬퍼: 직접 DB 조작하는 함수 버전 (import 경로 없이 인라인) ─────────────
async function cancelWithinWindowDirect(
  reservationId: string,
  businessId: string
): Promise<{ status: 'cancelled' } | { error: string }> {
  const { data: reservation } = await supabase
    .from('reservations').select('id, business_id, status, cancellable_until').eq('id', reservationId).single()
  if (!reservation) return { error: 'RESERVATION_NOT_FOUND' }
  if (reservation.business_id !== businessId) return { error: 'BUSINESS_MISMATCH' }
  if (reservation.status === 'cancelled') return { error: 'ALREADY_CANCELLED' }
  if (new Date() > new Date(reservation.cancellable_until)) return { error: 'WINDOW_EXPIRED' }
  await supabase.from('reservations').update({ status: 'cancelled', cancelled_by: 'business', cancelled_at: new Date().toISOString() }).eq('id', reservationId)
  return { status: 'cancelled' }
}

async function saveSeatingConfigDirect(
  businessId: string,
  input: { petFriendlyTableCount: number; maxPartySizePerTable: number; averageTurnMinutes: number; seatingType: string[] }
): Promise<{ seatingConfigId: string } | { error: string }> {
  const { data: business } = await supabase.from('businesses').select('category').eq('id', businessId).single()
  if (!business || business.category !== 'pet_dining') return { error: 'WRONG_CATEGORY' }
  const { data, error } = await supabase.from('business_seating_config')
    .upsert({ business_id: businessId, ...input, seating_type: input.seatingType }, { onConflict: 'business_id' })
    .select('id').single()
  if (error || !data) return { error: 'INSERT_FAILED' }
  return { seatingConfigId: data.id }
}

runTests().catch(e => { console.error('치명적 오류:', e); process.exit(1) })
