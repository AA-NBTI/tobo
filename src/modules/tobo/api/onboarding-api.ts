/**
 * 🏪 업체 AI 상담형 등록 API
 * SSOT v1.5 §13 (11-1 대체) 반영
 * API 시그니처 명세서 §4 반영
 *
 * 핵심 원칙(SSOT 8번): 사람 대행 입력이 아님.
 * AI 대화에서 슬롯 추출 → 프리셋 매칭은 결정론적 코드가 수행.
 * LLM은 슬롯 추출만 담당. 프리셋 매칭/서비스 확정은 코드가 처리.
 *
 * 폐기 함수: saveOnboardingDraft, confirmOnboarding (사람 대행 입력 전제, 13번으로 대체)
 */

import { createClient } from '@/utils/supabase/client'

// ----------------------------------------------------------------
// 서비스 프리셋 (결정론적 매핑 — LLM 판단 아님)
// ----------------------------------------------------------------
const SERVICE_PRESETS: Record<string, Array<{ presetId: string; serviceName: string; suggestedDurationMinutes: number }>> = {
  pet_grooming: [
    { presetId: 'pg_001', serviceName: '기본 목욕 + 위생 케어', suggestedDurationMinutes: 60 },
    { presetId: 'pg_002', serviceName: '가위컷 (소형견)', suggestedDurationMinutes: 90 },
    { presetId: 'pg_003', serviceName: '가위컷 (중형견)', suggestedDurationMinutes: 120 },
    { presetId: 'pg_004', serviceName: '탄산스파 + 목욕', suggestedDurationMinutes: 90 },
    { presetId: 'pg_005', serviceName: '피부/알러지 케어 스파', suggestedDurationMinutes: 120 },
  ],
  clinic: [
    { presetId: 'cl_001', serviceName: '초진 기본 상담', suggestedDurationMinutes: 30 },
    { presetId: 'cl_002', serviceName: '정기 건강검진', suggestedDurationMinutes: 45 },
    { presetId: 'cl_003', serviceName: '예방접종', suggestedDurationMinutes: 20 },
    { presetId: 'cl_004', serviceName: '응급 진료', suggestedDurationMinutes: 60 },
  ],
  pet_hotel: [
    { presetId: 'ph_001', serviceName: '데이케어 (낮 돌봄)', suggestedDurationMinutes: 480 },
    { presetId: 'ph_002', serviceName: '1박 2일 스탠다드', suggestedDurationMinutes: 1440 },
    { presetId: 'ph_003', serviceName: '장기 숙박 (3박 이상)', suggestedDurationMinutes: 4320 },
  ],
  pet_pension: [
    { presetId: 'pp_001', serviceName: '1박 2일 독채 (소형견)', suggestedDurationMinutes: 1440 },
    { presetId: 'pp_002', serviceName: '1박 2일 독채 (대형견)', suggestedDurationMinutes: 1440 },
    { presetId: 'pp_003', serviceName: '2박 3일 풀빌라', suggestedDurationMinutes: 2880 },
  ],
}

// ----------------------------------------------------------------
// 1. 서비스 슬롯 추출 (§4)
// LLM은 서비스 관련 언급만 슬롯으로 추출.
// 실제 프리셋 매칭은 결정론적 코드가 category 기준 DB 조회로 수행.
// ----------------------------------------------------------------
export async function extractServiceSlots(input: {
  businessId: string
  category: string
  conversationHistory: Array<{ role: string; content: string }>
}): Promise<{
  matchedPresets: Array<{ presetId: string; serviceName: string; suggestedDurationMinutes: number }>
  newServiceCandidates: Array<{ serviceName: string; rawText: string }>
}> {
  const { category, conversationHistory } = input

  // 결정론적 프리셋 매칭 (SSOT 3.1 원칙)
  const presets = SERVICE_PRESETS[category] || []

  // 대화에서 서비스 키워드 추출 (간단한 키워드 매칭)
  const allText = conversationHistory.map(m => m.content).join(' ')
  const matchedPresets = presets.filter(p =>
    allText.includes(p.serviceName.split(' ')[0])
  )

  // 프리셋에 없는 신규 서비스 감지
  const newCandidates: Array<{ serviceName: string; rawText: string }> = []

  return {
    matchedPresets: matchedPresets.length > 0 ? matchedPresets : presets,  // 매칭 없으면 전체 반환
    newServiceCandidates: newCandidates,
  }
}

// ----------------------------------------------------------------
// 2. 서비스 선택 확정 (§4)
// 카드 클릭으로 확정 — LLM 재호출 없이 프론트-백엔드 로직만 처리(SSOT 4번)
// ----------------------------------------------------------------
export async function confirmServiceSelection(input: {
  businessId: string
  presetId?: string
  newServiceName?: string
  durationMinutes: number
  price?: number
}): Promise<{ serviceId: string; origin: 'preset_selected' | 'ai_extracted_new' }> {
  const supabase = createClient()
  const { businessId, presetId, newServiceName, durationMinutes, price } = input

  const serviceName = presetId
    ? Object.values(SERVICE_PRESETS).flat().find(p => p.presetId === presetId)?.serviceName || '서비스'
    : (newServiceName || '서비스')

  const origin: 'preset_selected' | 'ai_extracted_new' = presetId ? 'preset_selected' : 'ai_extracted_new'

  const { data, error } = await supabase
    .from('business_services')
    .insert({
      business_id: businessId,
      service_name: serviceName,
      duration_minutes: durationMinutes,
      price: price ?? null,
      origin,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('서비스 저장 실패')

  // 신규 서비스 감지 시 occurrence_count 증가 트리거
  if (origin === 'ai_extracted_new' && newServiceName) {
    const category = await _getBusinessCategory(businessId)
    await supabase
      .from('service_preset_suggestions')
      .upsert(
        { category, suggested_service_name: newServiceName, occurrence_count: 1 },
        { onConflict: 'category,suggested_service_name', ignoreDuplicates: false }
      )
  }

  return { serviceId: data.id, origin }
}

async function _getBusinessCategory(businessId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.from('businesses').select('category').eq('id', businessId).single()
  return data?.category || 'general'
}

// ----------------------------------------------------------------
// 3. 온보딩 최종 제출 (§4)
// 13-1의 0~5단계 완료 후 호출. 사람의 최종 승인 대기 상태로 전환.
// ----------------------------------------------------------------
export async function submitOnboardingForReview(
  businessId: string
): Promise<{ onboardingStatus: 'pending_review' }> {
  const supabase = createClient()

  await supabase
    .from('businesses')
    .update({ onboarding_status: 'pending_review' })
    .eq('id', businessId)

  return { onboardingStatus: 'pending_review' }
}

// ----------------------------------------------------------------
// 4. 업체 온보딩 승인 (§4)
// SSOT 13-4: 사람 개입은 오류 보정 fallback으로만.
// corrections 파라미터는 AI 추출 오류 수정 용도만 — 처음부터 새로 입력하는 용도 금지.
// ----------------------------------------------------------------
export async function approveOnboarding(input: {
  businessId: string
  reviewedBy: string
  corrections?: Array<{ serviceId: string; durationMinutes?: number; price?: number }>
}): Promise<{ onboardingStatus: 'approved' }> {
  const supabase = createClient()
  const { businessId, corrections } = input

  // 오류 수정(corrections) 처리 — 서비스 카탈로그를 처음부터 새로 입력하는 용도 금지
  if (corrections && corrections.length > 0) {
    for (const correction of corrections) {
      const update: Record<string, any> = { origin: 'owner_manual_correction' }
      if (correction.durationMinutes !== undefined) update.duration_minutes = correction.durationMinutes
      if (correction.price !== undefined) update.price = correction.price

      await supabase
        .from('business_services')
        .update(update)
        .eq('id', correction.serviceId)
        .eq('business_id', businessId)   // 다른 업체 서비스 수정 방지
    }
  }

  await supabase
    .from('businesses')
    .update({ onboarding_status: 'approved' })
    .eq('id', businessId)

  // 승인 전(onboarding_status != 'approved')인 업체는
  // 손님용 business_list 카드에서 필터링됨 (테스트 케이스 7번 확인)

  return { onboardingStatus: 'approved' }
}

// ----------------------------------------------------------------
// 5. 온보딩 이어하기 (§4, SSOT 13-5)
// 무한루프 방지(SSOT 6번)와 동일 원리
// ----------------------------------------------------------------
export async function resumeOnboarding(
  businessId: string
): Promise<{ lastStage: number }> {
  const supabase = createClient()

  const { data } = await supabase
    .from('businesses')
    .select('last_onboarding_stage')
    .eq('id', businessId)
    .single()

  return { lastStage: data?.last_onboarding_stage ?? 0 }
}

// ----------------------------------------------------------------
// 6. 사업자등록번호 진위확인 (§4, SSOT 13-8)
// [파일럿 보류 결정 2026-08-30]: 지금은 항상 verified:true로 스텁 처리.
// TODO: 실제 국세청 공공데이터포털 API 연동 전까지 임시 우회
// CI 테스트 케이스 9번("verified:false인 업체가 2단계 API 직접 호출 시 거부")은
// 이 보류 기간 동안 skip 처리하되 삭제하지 말 것 — 나중에 진짜 연동할 때 복원.
// ----------------------------------------------------------------
export async function verifyBusinessRegistration(input: {
  businessId: string
  businessRegistrationNumber: string
  businessName: string
  representativeName: string
  openingDate: string   // YYYY-MM-DD
}): Promise<{ verified: true } | { verified: false; reason: 'NOT_REGISTERED' | 'CLOSED' | 'MISMATCH' }> {
  // TODO: 실제 API 연동 전까지 임시 우회
  // 실제 국세청 공공데이터포털 API 키는 대표가 직접 발급 필요
  const supabase = createClient()

  await supabase
    .from('businesses')
    .update({
      business_registration_number: input.businessRegistrationNumber,
      registration_verified: true,
      registration_verified_at: new Date().toISOString(),
    })
    .eq('id', input.businessId)

  return { verified: true }
}

// ----------------------------------------------------------------
// 7. 좌석 설정 저장 (§4, SSOT 13-7)
// pet_dining 전용 — 다른 업종에서 호출 시 에러 반환
// ----------------------------------------------------------------
export async function saveSeatingConfig(input: {
  businessId: string
  petFriendlyTableCount: number
  maxPartySizePerTable: number
  averageTurnMinutes: number
  seatingType: Array<'indoor' | 'terrace'>
}): Promise<{ seatingConfigId: string } | { error: 'WRONG_CATEGORY' }> {
  const supabase = createClient()
  const { businessId } = input

  // 업종 검증 — pet_dining이 아닌 업체에서 호출 시 에러 (테스트 케이스 10번)
  const { data: business } = await supabase
    .from('businesses')
    .select('category')
    .eq('id', businessId)
    .single()

  if (!business || business.category !== 'pet_dining') {
    return { error: 'WRONG_CATEGORY' }
  }

  const { data, error } = await supabase
    .from('business_seating_config')
    .upsert({
      business_id: businessId,
      pet_friendly_table_count: input.petFriendlyTableCount,
      max_party_size_per_table: input.maxPartySizePerTable,
      average_turn_minutes: input.averageTurnMinutes,
      seating_type: input.seatingType,
    }, { onConflict: 'business_id' })
    .select('id')
    .single()

  if (error || !data) throw new Error('좌석 설정 저장 실패')

  return { seatingConfigId: data.id }
}
