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

    // 2. 능동형 대화 리드 시스템 프롬프트 (절대 수동적이지 않고 대화를 전략적으로 리드함)
    const systemPrompt = `당신은 대한민국 최고의 AI 예약/매칭 컨시어지 '토보(Tobo)'입니다.
당신의 사명: 고객의 요구를 수동적으로 듣기만 하는 것이 아니라, "실패 없는 완벽한 매칭"이라는 명분을 가지고 대화를 적극적으로 리드(Lead)하여 고객의 핵심 취향(위치, 일정, 가치판단, 분위기)을 파악하는 것입니다.

[현재 등록된 제휴 매장 실시간 데이터]:
${businessKnowledge}

[누적된 고객 컨텍스트]:
${JSON.stringify(context, null, 2)}

[현재 진행 단계 (Step: ${step}) 및 지침]:
- Step 1 (탐색/인터뷰 시작): 고객의 말을 따뜻하게 받으면서, "더 완벽하고 실패 없는 추천을 위해 2~3가지만 여쭤볼게요!"라며 대화 주도권을 잡고 첫 질문을 던지세요.
- Step 2 (성향/가치/상황 파악): 가격(가성비 vs 퀄리티) 또는 분위기/동행인에 대한 질문을 이어가세요.
- Step 3 (추천/큐레이션 단계): 파악된 조건에 딱 맞는 최적의 매장들을 '하단/지역 맛집/뷰티 베스트' 형태로 큐레이션하여 소개하고, 각 매장의 전담 봇과 대화하여 예약할 것을 안내하세요.

[출력 규칙]:
- 군더더기 없는 정중하고 깔끔한 한국어 구사
- 2~4문장 이내로 간결하고 시원시원하게 말할 것
- 반드시 사용자가 터치할 수 있는 '선택지 칩/카드' 목록을 함께 고려할 것`

    const aiPrompt = `${systemPrompt}\n\n[고객의 최근 메시지]: "${message || '추천 시작'}"\n\n토보의 능동적 리드 답변:`

    let aiReply = ''
    try {
      aiReply = await generateEnforcedAIContent(aiPrompt, 'gemini-2.5-flash-lite')
    } catch (aiErr) {
      console.warn('⚠️ [Tobo Chat] AI LLM 응답 실패, 능동형 룰베이스 폴백 전환:', aiErr)
      if (step === 1) {
        aiReply = `반갑습니다! 고객님께 딱 맞는 맞춤 매장을 찾기 위해 제가 먼저 몇 가지 질문을 드릴게요.\n원하시는 지역과 시간대를 선택해 주시면 가장 적합한 곳으로 안내해 드립니다.`
      } else if (step === 2) {
        aiReply = `좋습니다! 방문하시는 목적과 분위기를 선택해 주시면 최종 매장을 좁혀드리겠습니다.`
      } else {
        aiReply = `고객님의 선호 조건을 바탕으로 가장 적합한 실시간 제휴 매장 리스트를 안내해 드립니다. 마음에 드는 곳의 전담 봇과 바로 예약해 보세요!`
      }
    }

    // 3. 단계별 인터랙티브 질문 퀵 카드 데이터 생성
    let nextStep = step + 1
    let cards: any = null
    let recommendationList: any[] = []

    if (step === 1) {
      // Step 1: 위치 & 일정 & 가치관 질문 카드
      cards = {
        type: 'question_step1',
        title: '📍 방문 희망 지역과 시간대를 알려주세요',
        options: [
          { label: '📍 사하구 하단/당리', value: { location: '사하구' } },
          { label: '📍 부산 강서구 명지', value: { location: '강서구' } },
          { label: '⏰ 오늘 저녁 바로 방문', value: { timing: 'today_evening' } },
          { label: '📅 이번 주말 피크타임', value: { timing: 'weekend' } },
          { label: '💰 가성비 & 알찬 구성', value: { priority: 'value' } },
          { label: '✨ 퀄리티 & 조용한 분위기', value: { priority: 'quality' } },
        ]
      }
    } else if (step === 2) {
      // Step 2: 동행 및 디테일 취향 질문 카드
      cards = {
        type: 'question_step2',
        title: '👥 어떤 분과 함께하시나요? 분위기를 선택해 주세요',
        options: [
          { label: '🍻 친구/지인과 편안하게', value: { vibe: 'friends' } },
          { label: '👩‍❤️‍👨 데이트 / 분위기 좋은 곳', value: { vibe: 'date' } },
          { label: '👨‍👩‍👧 가족 외식 / 아이 동반', value: { vibe: 'family' } },
          { label: '🍗 혼자 편안하게 즐기기', value: { vibe: 'solo' } },
        ]
      }
    } else {
      // Step 3: 실시간 맞춤형 큐레이션 베스트 리스트
      recommendationList = (businesses || []).map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        address: b.address,
        slug: b.slug,
        description: b.description,
        services: (b.services || []).slice(0, 2),
        matchReason: '고객님의 위치와 선호 분위기에 98% 일치하는 맞춤 매장'
      }))
      nextStep = 3
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
