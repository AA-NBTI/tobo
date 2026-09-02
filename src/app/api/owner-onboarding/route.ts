/**
 * 🏪 업체(사장님) AI 상담형 등록 API — SSOT §13
 *
 * 원칙:
 * 1. 카드 단계 진행은 결정론적 코드(LLM 불개입)
 * 2. LLM은 자유 텍스트에서 기본정보(상호명/주소/전화) 추출만 담당
 * 3. 최종 제출 시 onboarding_status = 'pending_review' (자동 승인 금지)
 * 4. 사람 개입은 pending_review → approved 게이트에서만
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── 서비스 프리셋 (결정론적 매핑) ───────────────────────────────
const SERVICE_PRESETS: Record<string, Array<{ id: string; name: string; durationMinutes: number; suggestedPrice?: number }>> = {
  pet_grooming: [
    { id: 'pg_001', name: '기본 목욕 + 위생 케어', durationMinutes: 60, suggestedPrice: 40000 },
    { id: 'pg_002', name: '가위컷 (소형견)', durationMinutes: 90, suggestedPrice: 60000 },
    { id: 'pg_003', name: '가위컷 (중형견)', durationMinutes: 120, suggestedPrice: 80000 },
    { id: 'pg_004', name: '탄산스파 + 목욕', durationMinutes: 90, suggestedPrice: 70000 },
    { id: 'pg_005', name: '피부/알러지 케어 스파', durationMinutes: 120, suggestedPrice: 90000 },
  ],
  clinic: [
    { id: 'cl_001', name: '초진 기본 상담', durationMinutes: 30, suggestedPrice: 30000 },
    { id: 'cl_002', name: '정기 건강검진', durationMinutes: 45, suggestedPrice: 50000 },
    { id: 'cl_003', name: '예방접종', durationMinutes: 20, suggestedPrice: 25000 },
    { id: 'cl_004', name: '응급 진료', durationMinutes: 60, suggestedPrice: 80000 },
  ],
  pet_hotel: [
    { id: 'ph_001', name: '데이케어 (낮 돌봄)', durationMinutes: 480, suggestedPrice: 35000 },
    { id: 'ph_002', name: '1박 2일 스탠다드', durationMinutes: 1440, suggestedPrice: 60000 },
    { id: 'ph_003', name: '장기 숙박 (3박 이상)', durationMinutes: 4320, suggestedPrice: 50000 },
  ],
  pet_dining: [
    { id: 'pd_001', name: '반려동물 동반 식사 (기본)', durationMinutes: 60, suggestedPrice: 0 },
    { id: 'pd_002', name: '애완동물 전용 메뉴 포함', durationMinutes: 90, suggestedPrice: 0 },
  ],
  pet_pension: [
    { id: 'pp_001', name: '1박 2일 독채 (소형견)', durationMinutes: 1440, suggestedPrice: 150000 },
    { id: 'pp_002', name: '1박 2일 독채 (대형견)', durationMinutes: 1440, suggestedPrice: 180000 },
    { id: 'pp_003', name: '2박 3일 풀빌라', durationMinutes: 2880, suggestedPrice: 280000 },
  ],
}

// ─── 카드 빌더 (결정론적) ─────────────────────────────────────────
function buildCard(step: number, category?: string): object | null {
  switch (step) {
    case 0:
      return {
        type: 'owner_category_select',
        cardId: 'OWNER_CATEGORY',
        title: '어떤 업종으로 등록하시겠어요?',
        options: [
          { label: '✂️ 강아지 미용 / 목욕', value: { category: 'pet_grooming' } },
          { label: '🏥 동물병원 / 진료', value: { category: 'clinic' } },
          { label: '🏨 애견호텔 / 유치원', value: { category: 'pet_hotel' } },
          { label: '🍽️ 애견동반 식당 / 카페', value: { category: 'pet_dining' } },
          { label: '🏕️ 애견동반 펜션 / 풀빌라', value: { category: 'pet_pension' } },
        ],
      }
    case 1:
      return {
        type: 'owner_basic_info',
        cardId: 'OWNER_BASIC_INFO',
        title: '업체의 기본 정보를 알려주세요.',
        fields: [
          { name: 'name', label: '업체명 (상호명)', placeholder: '예: 하단 뽀송펫 미용실', required: true },
          { name: 'region', label: '지역 (동/구 단위)', placeholder: '예: 하단동', required: true },
          { name: 'address', label: '상세 주소', placeholder: '예: 부산 사하구 하단동 123-4', required: true },
          { name: 'phone', label: '대표 전화번호', placeholder: '예: 051-123-4567', required: true },
        ],
      }
    case 2: {
      const presets = SERVICE_PRESETS[category || 'pet_grooming'] || []
      return {
        type: 'owner_service_catalog',
        cardId: 'OWNER_SERVICE_CATALOG',
        title: '제공하실 서비스를 선택해 주세요. (복수 선택 가능)',
        isMultiSelect: true,
        options: presets.map(p => ({
          label: `${p.name} (${p.durationMinutes}분${p.suggestedPrice ? ' / 권장 ' + p.suggestedPrice.toLocaleString() + '원' : ''})`,
          value: { presetId: p.id, serviceName: p.name, durationMinutes: p.durationMinutes, price: p.suggestedPrice },
        })),
      }
    }
    case 3:
      return {
        type: 'owner_hours',
        cardId: 'OWNER_HOURS',
        title: '운영 시간을 알려주세요.',
        options: [
          { label: '09:00 ~ 18:00', value: { open: '09:00', close: '18:00' } },
          { label: '10:00 ~ 19:00', value: { open: '10:00', close: '19:00' } },
          { label: '09:00 ~ 21:00', value: { open: '09:00', close: '21:00' } },
          { label: '직접 입력', value: { custom: true } },
        ],
        closedDaysOptions: [
          { label: '없음 (연중무휴)', value: [] },
          { label: '일요일 휴무', value: ['sun'] },
          { label: '매주 월·화 휴무', value: ['mon', 'tue'] },
        ],
      }
    case 4:
      return {
        type: 'owner_terms',
        cardId: 'OWNER_TERMS',
        title: '이용 약관에 동의해 주세요.',
        terms: [
          '등록된 업체 정보는 토보AI 플랫폼을 통해 손님에게 공개됩니다.',
          '등록 완료 후 관리자 검수(1~2 영업일) 후 서비스에 노출됩니다.',
          '허위 정보 등록 시 서비스 이용이 제한될 수 있습니다.',
        ],
        options: [
          { label: '✅ 모두 동의하고 등록 신청', value: { agreed: true } },
          { label: '❌ 취소', value: { agreed: false } },
        ],
      }
    case 5:
      return null // 제출 단계 — 카드 없음
    default:
      return null
  }
}

// ─── 기본정보 추출 (LLM — 자유 텍스트에서만) ─────────────────────
async function extractBasicInfo(text: string, currentCollected: any): Promise<any> {
  // 이미 수집된 것들은 그대로 유지
  if (!text || text.trim() === '') return currentCollected

  const prompt = `다음 사장님 발화에서 업체 기본정보를 추출하세요.
이미 수집된 정보: ${JSON.stringify(currentCollected)}

사장님 발화: "${text}"

아래 JSON만 출력 (없는 필드는 null):
{
  "name": "업체명",
  "region": "지역(동/구 단위)",
  "address": "상세 주소",
  "phone": "전화번호"
}`

  try {
    const raw = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it')
    const parsed = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim())
    // 기존 데이터 + 새로 추출된 것 merge (null은 기존값 유지)
    return {
      name: parsed.name || currentCollected.name || null,
      region: parsed.region || currentCollected.region || null,
      address: parsed.address || currentCollected.address || null,
      phone: parsed.phone || currentCollected.phone || null,
    }
  } catch {
    return currentCollected
  }
}

// ─── 메인 핸들러 ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      step = 0,
      message = '',
      collected = {},
    } = body

    const admin = getAdmin()

    // ── 단계별 처리 ─────────────────────────────────────────────

    // Step 0: 카테고리 선택 (카드 클릭)
    if (step === 0) {
      const category = body.selected?.category || collected.category
      if (!category) {
        return NextResponse.json({
          reply: '어떤 업종으로 등록하실지 아래에서 선택해 주세요! 😊',
          card: buildCard(0),
          nextStep: 0,
          collected,
        })
      }
      const newCollected = { ...collected, category }
      return NextResponse.json({
        reply: `${categoryLabel(category)} 업종으로 등록하시는군요! 이제 업체 기본 정보를 입력해 주세요.`,
        card: buildCard(1),
        nextStep: 1,
        collected: newCollected,
      })
    }

    // Step 1: 기본정보 수집
    if (step === 1) {
      // 카드 필드 직접 입력 or 자유 텍스트
      const fromFields = body.fields
      let info = { ...collected }

      if (fromFields) {
        info = { ...info, ...fromFields }
      } else if (message) {
        const extracted = await extractBasicInfo(message, {
          name: collected.name,
          region: collected.region,
          address: collected.address,
          phone: collected.phone,
        })
        info = { ...info, ...extracted }
      }

      const missing = (['name', 'address', 'region', 'phone'] as const).filter(k => !info[k])
      if (missing.length > 0) {
        const missingLabels: Record<string, string> = {
          name: '업체명', address: '상세 주소', region: '지역', phone: '전화번호'
        }
        return NextResponse.json({
          reply: `${missing.map(k => missingLabels[k]).join(', ')}을(를) 추가로 알려주세요!`,
          card: buildCard(1),
          nextStep: 1,
          collected: info,
        })
      }

      return NextResponse.json({
        reply: `기본 정보 확인됐습니다! 이제 어떤 서비스를 제공하실지 선택해 주세요.`,
        card: buildCard(2, info.category),
        nextStep: 2,
        collected: info,
      })
    }

    // Step 2: 서비스 카탈로그 선택
    if (step === 2) {
      const selectedServices = body.selectedServices || collected.services || []
      if (!selectedServices || selectedServices.length === 0) {
        return NextResponse.json({
          reply: '제공하실 서비스를 1개 이상 선택해 주세요! 복수 선택도 가능합니다. 😊',
          card: buildCard(2, collected.category),
          nextStep: 2,
          collected,
        })
      }

      const newCollected = { ...collected, services: selectedServices }
      return NextResponse.json({
        reply: `총 ${selectedServices.length}가지 서비스를 선택하셨어요! 다음은 운영 시간을 알려주세요.`,
        card: buildCard(3, newCollected.category),
        nextStep: 3,
        collected: newCollected,
      })
    }

    // Step 3: 운영시간 선택
    if (step === 3) {
      const hours = body.selected || collected.hours
      if (!hours || (!hours.open && !hours.custom)) {
        return NextResponse.json({
          reply: '운영 시간을 아래에서 선택해 주세요!',
          card: buildCard(3),
          nextStep: 3,
          collected,
        })
      }

      const closedDays = body.closedDays || collected.closedDays || []
      const newCollected = { ...collected, hours, closedDays }
      return NextResponse.json({
        reply: `운영 시간 확인됐습니다! 마지막으로 이용 약관에 동의해 주시면 등록 신청이 완료됩니다.`,
        card: buildCard(4),
        nextStep: 4,
        collected: newCollected,
      })
    }

    // Step 4: 약관 동의
    if (step === 4) {
      const agreed = body.selected?.agreed ?? collected.termsAgreed
      if (!agreed) {
        return NextResponse.json({
          reply: '등록 신청을 취소하셨어요. 언제든지 다시 시작하실 수 있습니다.',
          card: null,
          nextStep: 0,
          collected: {},
        })
      }

      const newCollected = { ...collected, termsAgreed: true }

      // ── 업체 최종 등록 (pending_review) ──────────────────────
      const slug = (newCollected.name || 'owner')
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40) + '-' + Date.now().toString(36)

      const { data: newBusiness, error: bizErr } = await admin
        .from('businesses')
        .insert({
          name: newCollected.name,
          category: newCollected.category,
          address: newCollected.address,
          region: newCollected.region,
          phone: newCollected.phone,
          slug,
          is_active: false,                   // 승인 전까지 비활성
          onboarding_status: 'pending_review', // SSOT §13: 자동 승인 금지
          last_onboarding_stage: 5,
          registration_verified: false,
        })
        .select('id')
        .single()

      if (bizErr || !newBusiness) {
        console.error('[owner-onboarding] 업체 생성 실패:', bizErr)
        return NextResponse.json({ error: '업체 생성에 실패했습니다. 다시 시도해 주세요.' }, { status: 500 })
      }

      const businessId = newBusiness.id

      // 서비스 일괄 등록
      if (newCollected.services?.length > 0) {
        await admin.from('business_services').insert(
          newCollected.services.map((s: any) => ({
            business_id: businessId,
            service_name: s.serviceName,
            duration_minutes: s.durationMinutes,
            price: s.price ?? null,
            origin: 'preset_selected',
          }))
        )
      }

      // 마지막 단계 저장
      await admin
        .from('businesses')
        .update({ last_onboarding_stage: 5 })
        .eq('id', businessId)

      return NextResponse.json({
        reply: '🎉 등록 신청이 완료됐어요! 관리자 검수(1~2 영업일) 후 서비스에 노출됩니다. 궁금한 점은 언제든지 문의해 주세요.',
        card: null,
        nextStep: 5,
        collected: { ...newCollected, businessId },
        onboardingStatus: 'pending_review',
        businessId,
      })
    }

    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  } catch (err: any) {
    console.error('[owner-onboarding] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function categoryLabel(cat: string): string {
  const MAP: Record<string, string> = {
    pet_grooming: '✂️ 강아지 미용/목욕',
    clinic: '🏥 동물병원/진료',
    pet_hotel: '🏨 애견호텔/유치원',
    pet_dining: '🍽️ 애견동반 식당/카페',
    pet_pension: '🏕️ 애견동반 펜션/풀빌라',
  }
  return MAP[cat] || cat
}
