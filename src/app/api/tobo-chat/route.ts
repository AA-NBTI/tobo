import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateEnforcedAIContent, generateEmbedding } from '@/utils/ai-core'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Tobo 메인 능동형 컨시어지 대화 & 전략적 질문/추천 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, step = 1, context = {}, history = [] } = body

    if (!message && step === 1) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const admin = getAdmin()

    // 1. 사용자 메시지 임베딩 생성 (노굿뉴스 bge-m3 벡터 엔진 가동)
    let userQueryEmbedding: number[] | null = null
    try {
      if (message) {
        userQueryEmbedding = await generateEmbedding(message)
      }
    } catch (embErr) {
      console.warn('⚠️ [Tobo Chat] 임베딩 생성 오류:', embErr)
    }

    // 2. 등록된 모든 활성 매장 및 서비스 데이터 조회
    const { data: businesses } = await admin
      .from('businesses')
      .select('id, name, category, address, phone, slug, description, services(id, name, price, duration_minutes)')
      .eq('is_active', true)
      .limit(10)

    const businessKnowledge = (businesses || []).map(b => {
      const svcs = (b.services || []).map((s: any) => `${s.name}(${s.price === 0 ? '무료' : `${s.price.toLocaleString()}원`})`).join(', ')
      return `- [${b.name}] 카테고리: ${b.category}, 위치: ${b.address || '정보없음'}, 서비스: ${svcs || '기본상담'}, 슬러그: ${b.slug}`
    }).join('\n')

    // 3. 대화 히스토리 구성 (맥락 완벽 파악)
    const formattedHistory = (history || []).map((h: any) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`).join('\n')

    // 3. 사용자의 의도 및 업종/키워드 분석
    const lowerMsg = (message || '').toLowerCase()
    const isBeauty = /미용|헤어|머리|네일|스파|반려견|강아지|펫|멍/.test(lowerMsg)
    const isFood = /치킨|통닭|고기|맛집|식당|술|밥|한식|카페|맥주|회식/.test(lowerMsg)
    const isClinic = /병원|치과|의원|진료|상담|한의원|피부과/.test(lowerMsg)

    // 4. 진짜 능동형 AI 컨시어지 시스템 프롬프트
    const systemPrompt = `당신은 초개인화 로컬 예약·상담 전문 AI 컨시어지 '토보(Tobo)'입니다.

[토보(Tobo)의 정체성과 사명]:
1. 당신은 세상 모든 지식을 읊는 백과사전 봇이 아니라, **"고객 주변의 검증된 로컬 매장(미용/뷰티/헤어/맛집/클리닉)을 1:1로 밀착 상담하고 실시간 예약해 주는 전문 예약 컨시어지 AI"**입니다.
2. 고객이 무엇을 묻든(잡담, 사이트 정체 질문, 엉뚱한 대형 LLM식 질문 등), **재치 있고 친절하게 받아준 뒤 우리의 전문 영역(로컬 매칭/예약 상담)으로 대화의 주도권을 부드럽게 가져오세요.**
   - 고객: "여기 뭐하는 곳이야?"
     → 토보: "반갑습니다! 저는 고객님 계신 곳 주변의 실력 있는 헤어샵, 뷰티, 맛집 등 실패 없는 로컬 매장을 1:1로 맞춤 매칭하고 예약까지 도와드리는 전문 컨시어지 AI 토보예요. 혹시 오늘 찾으시는 동네나 서비스가 있으신가요?"
   - 고객: "양자역학에 대해 알려줘"
     → 토보: "양자역학도 흥미롭지만, 머리 복잡할 땐 시원하게 머리 손질 받으시거나 맛있는 음식 드시는 게 최고죠! 저는 고객님 근처의 미용실이나 맛집 예약 상담에 특화된 AI예요. 오늘 기분 전환할 곳을 찾아드릴까요?"
   - 고객: "심심해"
     → 토보: "심심할 땐 기분 전환이 딱이죠! 혹시 오늘 근처에서 헤어스타일 바꾸시거나 맛있는 거 드실 계획 있으신가요? 동네 말씀해 주시면 제가 딱 맞는 곳 찾아드릴게요."

[현재 등록된 실시간 제휴 매장 데이터]:
${businessKnowledge}

[현재까지 누적된 고객 데이터]:
${JSON.stringify(context, null, 2)}

[이전 대화 내역]:
${formattedHistory || '(대화 시작)'}

[대화 원칙]:
- 사람처럼 자연스럽고 매끄러운 2~3문장 한국어.
- 고객의 말에 확실히 공감하며 맞장구치고, 대화의 끝은 항상 우리가 예약/탐색을 도와줄 수 있는 방향으로 질문을 던지며 리드할 것.`

    const aiPrompt = `${systemPrompt}\n\n[고객의 메시지]: "${message}"\n\n토보의 능동적 대화 답변:`

    let aiReply = ''
    try {
      aiReply = await generateEnforcedAIContent(aiPrompt, 'gemma-4-31b-it')
    } catch (aiErr) {
      console.warn('⚠️ [Tobo Chat] AI LLM 에러:', aiErr)
      aiReply = `반갑습니다! 저는 고객님 주변의 미용실, 뷰티샵, 맛집 등 로컬 매장 맞춤 추천과 실시간 예약을 전문으로 돕는 AI 토보입니다. 오늘 어떤 서비스를 도와드릴까요?`
    }

    // 5. 대화 맥락에 기반한 [지능형 상황별 카드] 트리거 (무조건 카드를 띄우지 않고 맥락이 형성되었을 때만 띄움)
    let cards: any = null
    let recommendationList: any[] = []

    const isAskingAboutService = /뭐하는|누구|소개|안녕|하이|hi|hello|심심|테스트/.test(lowerMsg)
    const mentionsLocation = /부산|사하|하단|명지|서면|해운대|남포|동래|강서/.test(lowerMsg)
    const mentionsBookingOrLooking = /예약|추천|찾아|가고|미용|헤어|치킨|맛집|식당|병원|스파/.test(lowerMsg)

    // 맥락 1: 사용자가 지역/탐색 의사를 밝혔으나 구체적 지역이 없을 때 -> 지역 선택 카드
    if ((mentionsBookingOrLooking || isFood || isBeauty || isClinic) && !mentionsLocation && !context.location) {
      cards = {
        type: 'location_picker',
        title: '어느 지역 주변으로 찾아드릴까요?',
        options: [
          { label: '부산 사하구 (하단/당리)', value: { location: '사하구' } },
          { label: '부산 강서구 (명지)', value: { location: '강서구' } },
          { label: '부산진구 (서면)', value: { location: '부산진구' } },
          { label: '기타 지역 직접 입력', value: { location: 'other' } },
        ]
      }
    }
    // 맥락 2: 지역이 정해졌거나 음식/치킨 세부 취향 대화 시 -> 취향 카드
    else if ((mentionsLocation || context.location) && (isFood || context.category === 'restaurant')) {
      cards = {
        type: 'food_vibe_picker',
        title: '선호하시는 스타일이나 분위기를 선택해 주세요',
        options: [
          { label: '친구와 시원한 생맥주 한잔', value: { vibe: 'beer' } },
          { label: '겉바속촉 가마솥/옛날통닭', value: { menu: 'crispy' } },
          { label: '조용한 프라이빗 대화 공간', value: { vibe: 'private' } },
          { label: '가성비 좋고 푸짐한 곳', value: { priority: 'value' } },
        ]
      }
    }
    // 맥락 3: 뷰티/헤어/반려견 세부 케어 대화 시 -> 서비스 카드
    else if ((mentionsLocation || context.location) && (isBeauty || context.category === 'beauty')) {
      cards = {
        type: 'beauty_style_picker',
        title: '희망하시는 케어 스타일을 선택해 주세요',
        options: [
          { label: '1인 단독 스트레스 프리 케어', value: { style: 'private_care' } },
          { label: '프리미엄 탄산 스파 & 목욕', value: { style: 'spa' } },
          { label: '전체 가위컷 / 스타일링', value: { style: 'scissor_cut' } },
        ]
      }
    }
    // 맥락 4: 충분한 조건이 모였거나 매칭을 원할 때 -> 추천 매장 리스트 출력
    if (step >= 2 || (context.location && (context.vibe || context.menu || context.style || context.priority))) {
      recommendationList = (businesses || []).map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        address: b.address,
        slug: b.slug,
        description: b.description,
        services: (b.services || []).slice(0, 2),
        matchReason: `고객님의 조건(${context.location || '사하구'} 맞춤)에 가장 부합하는 검증된 매장`
      }))
    }

    const nextStep = recommendationList.length > 0 ? 3 : step + 1

    return NextResponse.json({
      reply: aiReply?.trim(),
      step: nextStep,
      cards: cards || undefined,
      recommendationList: recommendationList.length > 0 ? recommendationList : undefined
    })
  } catch (err: any) {
    console.error('/api/tobo-chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
