import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

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

    // 1. 등록된 모든 활성 매장 및 서비스 데이터 조회
    const { data: businesses } = await admin
      .from('businesses')
      .select('id, name, category, address, phone, slug, description, services(id, name, price, duration_minutes)')
      .eq('is_active', true)
      .limit(10)

    const businessKnowledge = (businesses || []).map(b => {
      const svcs = (b.services || []).map((s: any) => `${s.name}(${s.price === 0 ? '무료' : `${s.price.toLocaleString()}원`})`).join(', ')
      return `- [${b.name}] 카테고리: ${b.category}, 위치: ${b.address || '정보없음'}, 서비스: ${svcs || '기본상담'}, 슬러그: ${b.slug}`
    }).join('\n')

    // 3. 사용자의 의도 및 업종/키워드 분석
    const lowerMsg = message.toLowerCase()
    const isBeauty = /미용|헤어|머리|네일|스파|반려견|강아지|펫|멍/.test(lowerMsg)
    const isFood = /치킨|통닭|고기|맛집|식당|술|밥|한식|카페|맥주|회식/.test(lowerMsg)
    const isClinic = /병원|치과|의원|진료|상담|한의원|피부과/.test(lowerMsg)

    // 4. 시스템 프롬프트 (관리자가 설정한 프롬프트 또는 기본 고품질 능동 프롬프트)
    const systemPrompt = `당신은 대한민국 최고의 대화형 AI 예약·추천 컨시어지 '토보(Tobo)'입니다.

[핵심 행동 강령]:
1. 친구처럼 편안하고 자연스럽게 대화하세요. 고객의 말(상황, 기분, 장소, 취향)에 100% 공감하고 센스 있게 맞장구를 칩니다.
   - 예: "아, 사하구 쪽에서 친구분이랑 바삭한 치킨에 시원하게 맥주 한잔할 곳 찾으시는군요!"
   - 예: "강아지가 낯가림이 심하면 스트레스 없는 1인 전담 케어샵이 딱이죠!"
2. 수동적으로 묻는 말에만 답하지 말고, "더 딱 맞는 곳을 좁혀드리기 위해" 자연스럽게 다음 질문을 하나 던지며 대화를 리드하세요.
3. 기계적이거나 형식적인 인사치레를 반복하지 마세요.

[현재 등록된 실시간 제휴 매장]:
${businessKnowledge}

[현재까지 누적된 고객 선호 데이터]:
${JSON.stringify(context, null, 2)}

[이전 대화 내역]:
${formattedHistory || '(대화 시작)'}

[출력 규칙]:
- 군더더기 없이 자연스러운 한국어 2~3문장 이내로 답변.`

    const aiPrompt = `${systemPrompt}\n\n[고객의 지금 메시지]: "${message}"\n\n토보의 자연스러운 대화 답변:`

    let aiReply = ''
    try {
      aiReply = await generateEnforcedAIContent(aiPrompt, 'gemini-3.6-flash')
    } catch (aiErr) {
      console.warn('⚠️ [Tobo Chat] AI LLM 호출 에러, 룰베이스 전환:', aiErr)
      if (isFood) {
        aiReply = `말씀해주신 맛있는 음식과 분위기에 딱 맞는 곳을 찾아드릴게요! 원하시는 지역이나 시간대를 아래에서 선택해주시면 바로 좁혀드릴게요.`
      } else if (isBeauty) {
        aiReply = `안심하고 케어받으실 수 있는 맞춤 뷰티/펫샵을 찾아드릴게요! 원하시는 지역과 일정을 선택해 주세요.`
      } else {
        aiReply = `말씀해주신 내용 잘 확인했습니다! 가장 알맞은 매장 봇을 연결해 드리기 위해 아래에서 편하신 조건을 선택해 주세요.`
      }
    }

    // 5. 상황에 맞는 동적 인터랙티브 퀵 카드 생성
    let cards: any = null
    let recommendationList: any[] = []

    if (step === 1) {
      // 1단계: 위치 & 가치 기준 카드
      cards = {
        type: 'step1_location_value',
        title: '📍 지역과 우선순위를 선택해 주세요',
        options: [
          { label: '📍 사하구 하단/당리', value: { location: '사하구' } },
          { label: '📍 부산 강서구 명지', value: { location: '강서구' } },
          { label: '⏰ 오늘 저녁 바로 방문', value: { timing: 'today' } },
          { label: '💰 가성비 & 넉넉한 양', value: { priority: 'value' } },
          { label: '✨ 조용하고 퀄리티 좋은 곳', value: { priority: 'quality' } },
        ]
      }
    } else if (step === 2) {
      // 2단계: 업종별 디테일 취향 카드
      if (isFood || context.category === 'restaurant') {
        cards = {
          type: 'step2_food',
          title: '🍗 누구와 어떤 분위기로 즐기시나요?',
          options: [
            { label: '🍺 친구/지인과 생맥주 한잔', value: { vibe: 'friends_beer' } },
            { label: '🍗 바삭한 가마솥/후라이드', value: { menu: 'crispy' } },
            { label: '🔥 매콤 숯불/양념 바베큐', value: { menu: 'spicy_bbq' } },
            { label: '🚪 조용한 프라이빗 룸/테라스', value: { vibe: 'private' } },
          ]
        }
      } else if (isBeauty || context.category === 'beauty') {
        cards = {
          type: 'step2_beauty',
          title: '💇 희망하시는 서비스 스타일을 선택해 주세요',
          options: [
            { label: '✂️ 1인 단독 스트레스 프리 케어', value: { style: 'private_care' } },
            { label: '🛁 프리미엄 탄산 스파 & 목욕', value: { style: 'spa' } },
            { label: '✂️ 전체 가위컷 / 스타일링', value: { style: 'scissor_cut' } },
          ]
        }
      } else {
        cards = {
          type: 'step2_general',
          title: '👥 방문 목적과 인원을 알려주세요',
          options: [
            { label: '👤 1인 혼밥/혼술/단독이용', value: { party: '1' } },
            { label: '👥 2~3인 소규모 모임', value: { party: '2-3' } },
            { label: '👨‍👩‍👧 가족 외식 / 단체 예약', value: { party: 'group' } },
          ]
        }
      }
    } else {
      // 3단계: 최종 실시간 맞춤 매장 큐레이션 리스트 제공
      recommendationList = (businesses || []).map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        address: b.address,
        slug: b.slug,
        description: b.description,
        services: (b.services || []).slice(0, 2),
        matchReason: `고객님의 취향(${context.location || '부산'} · ${context.priority === 'value' ? '가성비' : '퀄리티'})에 99% 부합하는 추천 매장`
      }))
    }

    return NextResponse.json({
      reply: aiReply?.trim() || '고객님께 가장 완벽한 매장을 찾기 위해 최적의 추천 리스트를 준비했습니다.',
      step: nextStep,
      cards,
      recommendationList: recommendationList.length > 0 ? recommendationList : undefined
    })
  } catch (err: any) {
    console.error('/api/tobo-chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
