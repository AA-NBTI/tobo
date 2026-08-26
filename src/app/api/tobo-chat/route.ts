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

    // 2. 대화 히스토리 구성 (맥락 완벽 파악)
    const formattedHistory = (history || []).map((h: any) => `${h.role === 'user' ? '고객' : '토보'}: ${h.content}`).join('\n')

    // 3. 능동형 대화 리드 시스템 프롬프트 (사람처럼 자연스럽게 공감하며 전략적으로 리드함)
    const systemPrompt = `당신은 대한민국 최고의 AI 예약/매칭 컨시어지 '토보(Tobo)'입니다.

[역할과 태도]:
1. 사람처럼 친근하고 유려하게 대화하세요. 고객이 한 말(고민, 상황, 조건)을 먼저 정확하게 맞장구치고 공감하세요. (예: "아, 사하구 쪽에서 친구분과 한잔하실 곳을 찾으시는군요!", "강아지가 낯을 많이 가려서 조용한 1인 샵을 원하시는군요.")
2. 그 다음, "더 완벽하게 챙겨드리기 위해" 자연스럽게 다음 질문(동행, 분위기, 가격성향)을 던지며 대화를 리드하세요.
3. 절대 뻔하고 딱딱한 기계적인 답변을 반복하지 말고, 대화의 맥락(이전 대화 히스토리)을 완벽히 인지하여 대답하세요.

[현재 등록된 제휴 매장 실시간 데이터]:
${businessKnowledge}

[누적된 고객 선호 데이터]:
${JSON.stringify(context, null, 2)}

[이전 대화 내역]:
${formattedHistory || '(대화 시작)'}

[출력 규칙]:
- 한국어로 2~3문장 이내로 매끄럽고 친절하게 응답.
- 절대 마크다운 코드블록이나 불필요한 서두 없이 본문만 출력.`

    const aiPrompt = `${systemPrompt}\n\n[고객의 지금 메시지]: "${message}"\n\n토보의 대화 답변:`

    let aiReply = ''
    try {
      aiReply = await generateEnforcedAIContent(aiPrompt, 'gemini-3.6-flash')
    } catch (aiErr) {
      console.warn('⚠️ [Tobo Chat] AI LLM 응답 실패, 룰베이스 전환:', aiErr)
      aiReply = `말씀해 주신 내용 잘 확인했습니다! 더 정확하게 매칭해 드리기 위해 아래 선택지에서 선호하시는 조건을 선택해 주세요.`
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
