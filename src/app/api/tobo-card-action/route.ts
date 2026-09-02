/**
 * ⚡ /api/tobo-card-action — 카드 클릭 전용 엔드포인트 (Zero LLM)
 *
 * 원칙:
 * 1. LLM 호출 완전 금지 — 모든 분기는 결정론적 코드
 * 2. 응답 문구는 CARD_COPY 맵에서만 → LLM 생성 금지
 * 3. 슬롯 조작은 반드시 공유 유틸(mergeSlots / buildFilledSlots)만 사용
 * 4. category_select부터 reservation_confirm까지 이 경로만으로 100% 완주
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  mergeSlots,
  buildFilledSlots,
  prepareLeadMaterial,
  selectBestCard,
  SlotMap,
} from '@/modules/tobo/engine/lead-material-orchestrator'
import { rankRealBusinesses } from '@/modules/tobo/engine/matching-scorer'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── 고정 응답 문구 맵 (LLM 완전 배제) ────────────────────────
function categoryLabel(cat: string | null | undefined): string {
  const MAP: Record<string, string> = {
    pet_grooming: '✂️ 강아지 미용/목욕',
    clinic:       '🏥 동물병원/진료',
    pet_hotel:    '🏨 애견호텔/유치원',
    pet_dining:   '🍽️ 애견동반 식당/카페',
    pet_pension:  '🏕️ 애견동반 펜션/풀빌라',
  }
  return MAP[cat || ''] || '해당 서비스'
}

const CARD_COPY: Record<string, (s: SlotMap) => string> = {
  category_select:      ()  => '어떤 서비스의 예약을 도와드릴까요? 😊',
  region_select:        (s) => `${categoryLabel(s.category)}을(를) 선택하셨어요! 어느 지역 매장을 찾으시나요?`,
  pet_size_select:      (s) => `${s.region_hint || ''} 지역으로 찾아볼게요! 반려동물의 체급을 알려주세요 🐶`,
  duration_select:      (s) => `${s.region_hint || ''} 지역으로 찾아볼게요! 숙박/돌봄 기간을 알려주세요 🏨`,
  clinic_purpose_select:(s) => `${s.region_hint || ''} 근처 동물병원을 찾아볼게요! 방문 목적을 알려주세요 🏥`,
  priority_select:      ()  => '세부 조건 확인됐어요! 예약 시 가장 중요하게 생각하시는 부분은 무엇인가요?',
  business_list:        ()  => '조건에 딱 맞는 매장을 찾았어요! 아래에서 선택해 주세요 ⭐',
  date_select:          (s) => `${s.business_name || '매장'}을 선택하셨어요! 언제 방문하실 건가요? 📅`,
  time_slot:            (s) => `${s.target_date || ''} 방문 확인! 원하시는 시간대를 선택해주세요 🕐`,
  reservation_confirm:  ()  => '거의 다 왔어요! 아래 예약 정보를 확인하고 확정해 주세요 ✅',
  unmet_notification:   ()  => '앗, 아직 준비 중인 서비스예요 😢 오픈 시 가장 먼저 알려드릴까요?',
}

function getReply(cardType: string | null, slots: SlotMap): string {
  if (!cardType) return '알겠어요! 추가로 궁금한 점이 있으면 언제든지 물어보세요 😊'
  return CARD_COPY[cardType]?.(slots) ?? '다음 단계로 안내해 드릴게요!'
}

// ─── 업체 목록 조회 (approved + is_active 이중 필터) ──────────
async function fetchApprovedBusinesses(
  admin: ReturnType<typeof getAdmin>,
  slots: SlotMap
): Promise<any[]> {
  let q = admin
    .from('businesses')
    .select('id, name, category, address, region, pet_size, price_range, is_active, slug')
    .eq('is_active', true)
    .eq('onboarding_status', 'approved')
  if (slots.category && slots.category !== 'UNSUPPORTED') {
    q = q.eq('category', slots.category)
  }
  if (slots.region_hint) {
    q = q.ilike('region', `%${slots.region_hint}%`)
  }
  const { data } = await q.limit(10)
  return data || []
}

// ─── 시간 슬롯 조회 ────────────────────────────────────────────
async function fetchTimeSlots(
  admin: ReturnType<typeof getAdmin>,
  businessId: string,
  targetDate: string
): Promise<Array<{ label: string; value: any }>> {
  // 기본 슬롯 (업체 스케줄 테이블이 없으면 고정 슬롯 반환)
  try {
    const { data: schedules } = await admin
      .from('business_schedules')
      .select('time_slot, is_available')
      .eq('business_id', businessId)
      .eq('date', targetDate)
      .eq('is_available', true)
      .order('time_slot')
      .limit(10)

    if (schedules && schedules.length > 0) {
      return schedules.map((s: any) => ({
        label: `🕐 ${s.time_slot}`,
        value: { target_time: s.time_slot },
      }))
    }
  } catch { /* fallback */ }

  // Fallback: 고정 슬롯
  return ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => ({
    label: `🕐 ${t}`,
    value: { target_time: t },
  }))
}

// ─── 예약 INSERT ───────────────────────────────────────────────
async function createReservation(
  admin: ReturnType<typeof getAdmin>,
  slots: SlotMap,
  userId: string
): Promise<{ reservationId: string | null; error: string | null }> {
  if (!slots.business_id || !slots.target_date || !slots.target_time) {
    return { reservationId: null, error: '필수 예약 정보가 부족합니다.' }
  }
  // reservation_time: "YYYY-MM-DD HH:MM" → ISO timestamp
  const dateStr = slots.target_date // e.g. "2026-09-02" or "오늘"
  const timeStr = slots.target_time // e.g. "10:00"
  const reservationTime = (() => {
    try {
      const base = dateStr === '오늘' ? new Date().toISOString().slice(0, 10)
        : dateStr === '내일' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
        : dateStr
      return new Date(`${base}T${timeStr}:00+09:00`).toISOString()
    } catch { return new Date().toISOString() }
  })()

  const { data, error } = await admin
    .from('reservations')
    .insert({
      business_id: slots.business_id,
      user_id: userId === 'anonymous' ? null : userId,
      reservation_time: reservationTime,
      party_size: 1,
      customer_name: slots.customer_name || '앱 예약 손님',
      customer_phone: slots.customer_phone || '00000000000',
      status: 'confirmed',
      notes: `카드경로 | 카테고리:${slots.category || '-'} | 체급:${slots.pet_size || '-'} | 우선순위:${slots.priority || '-'}`,
    })
    .select('id')
    .single()

  if (error) return { reservationId: null, error: error.message }
  return { reservationId: data?.id ?? null, error: null }
}

// ─── 메인 핸들러 ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const t0 = Date.now()

  try {
    const body = await req.json()
    const {
      cardType,          // 방금 사용자가 클릭한 카드 타입
      selectedValue,     // 클릭한 옵션의 value 객체
      currentSlots = {}, // 현재까지 쌓인 슬롯
      userId = 'anonymous',
      lastShownCardType = null,
      confirmReservation = false, // reservation_confirm 단계 최종 확정
    } = body

    const admin = getAdmin()

    // 1. 슬롯 머지 (공유 유틸 사용 — LLM 없음)
    const mergedSlots: SlotMap = mergeSlots(currentSlots, selectedValue || {})

    // business_list에서 업체 선택 시 business_name도 저장
    if (selectedValue?.business_id && selectedValue?.name) {
      mergedSlots.business_name = selectedValue.name
    }

    // 2. filledSlots 구성 (공유 유틸 사용)
    const filledSlots = buildFilledSlots(mergedSlots)

    // 3. 다음 카드 결정 (결정론적)
    const { cardType: nextCardType, action } = selectBestCard(
      filledSlots,
      lastShownCardType,
      0,         // 카드 클릭 경로는 루프 방지 카운터 항상 리셋
      false,
      mergedSlots.category
    )

    // 4. 카드별 추가 데이터 로드 + 예약 처리
    let card: any = null
    let recommendationList: any[] = []
    let reservationId: string | null = null
    let reservationError: string | null = null

    if (action === 'SHOW_CARD' && nextCardType) {
      card = prepareLeadMaterial(nextCardType, mergedSlots.category ?? null)

      // business_list: 업체 조회 + 랭킹
      if (nextCardType === 'business_list') {
        const businesses = await fetchApprovedBusinesses(admin, mergedSlots)
        recommendationList = rankRealBusinesses(businesses, {
          target_category: mergedSlots.category || 'pet_grooming',
          preferred_region: mergedSlots.region_hint || undefined,
          pet_size: mergedSlots.pet_size || undefined,
          priority_select: mergedSlots.priority || undefined,
        })
      }

      // time_slot: 해당 업체 스케줄 조회
      if (nextCardType === 'time_slot' && mergedSlots.business_id && mergedSlots.target_date) {
        const timeOptions = await fetchTimeSlots(admin, mergedSlots.business_id, mergedSlots.target_date)
        card = { ...card, options: timeOptions }
      }

      // reservation_confirm: 요약 카드 (DB 조회 없음)
      if (nextCardType === 'reservation_confirm') {
        card = {
          ...card,
          summary: {
            category: mergedSlots.category,
            businessName: mergedSlots.business_name,
            date: mergedSlots.target_date,
            time: mergedSlots.target_time,
            petSize: mergedSlots.pet_size,
          }
        }
      }
    }

    // reservation_confirm 최종 확정 클릭
    if (cardType === 'reservation_confirm' && confirmReservation) {
      const result = await createReservation(admin, mergedSlots, userId)
      reservationId = result.reservationId
      reservationError = result.error
    }

    const elapsedMs = Date.now() - t0

    return NextResponse.json({
      reply: getReply(nextCardType, mergedSlots),
      card,
      updatedSlots: mergedSlots,
      recommendationList,
      elapsedMs,
      ...(reservationId ? { reservationId, reservationStatus: 'pending' } : {}),
      ...(reservationError ? { reservationError } : {}),
    })
  } catch (err: any) {
    const elapsedMs = Date.now() - t0
    console.error('[tobo-card-action] error:', err)
    return NextResponse.json({ error: err.message, elapsedMs }, { status: 500 })
  }
}
