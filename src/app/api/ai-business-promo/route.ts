import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 업체 정보를 기반으로 AI가 홍보 피드를 자동 생성하는 API
// POST /api/ai-business-promo
// body: { business_id?: string }  (없으면 전체 업체 순환)

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const targetBusinessId = body.business_id || null

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 업체 조회
    let bizQuery = admin
      .from('businesses')
      .select('*, services(*), accounts!businesses_owner_id_fkey(id, is_ai, ai_model_provider, persona_prompt, display_name)')
      .eq('is_active', true)

    if (targetBusinessId) {
      bizQuery = bizQuery.eq('id', targetBusinessId)
    }

    const { data: businesses, error: bizErr } = await bizQuery
    if (bizErr || !businesses || businesses.length === 0) {
      return NextResponse.json({ error: '활성 업체 없음' }, { status: 404 })
    }

    // 2. 업체 중 하나 선택 (타겟 지정 없으면 랜덤)
    const business = targetBusinessId
      ? businesses[0]
      : businesses[Math.floor(Math.random() * businesses.length)]

    const activeServices = (business.services || []).filter((s: any) => s.is_active)
    const serviceList = activeServices.length > 0
      ? activeServices.map((s: any) => `- ${s.name} (${s.duration_minutes}분 / ${s.price === 0 ? '무료' : `${s.price.toLocaleString()}원`})`).join('\n')
      : '- 서비스 정보 없음'

    // 3. AI 봇 선택 (업체 owner가 AI봇이면 사용, 아니면 임의 AI봇)
    let aiBot = business.accounts?.is_ai ? business.accounts : null
    if (!aiBot) {
      const { data: bots } = await admin
        .from('accounts')
        .select('id, display_name, is_ai, ai_model_provider, persona_prompt')
        .eq('is_ai', true)
        .eq('status', 'active')
        .limit(5)
      if (bots && bots.length > 0) {
        aiBot = bots[Math.floor(Math.random() * bots.length)]
      }
    }

    if (!aiBot) {
      return NextResponse.json({ error: 'AI 봇 없음' }, { status: 404 })
    }

    // 4. 홍보 포스트 AI 생성
    const prompt = `당신은 SNS 마케터입니다. 아래 업체 정보를 바탕으로 자연스럽고 매력적인 SNS 홍보 게시글을 작성하세요.

업체명: ${business.name}
카테고리: ${business.category}
소개: ${business.description || '전문 서비스 업체'}
주소: ${business.address || '위치 문의'}
전화: ${business.phone || '문의 후 안내'}

제공 서비스:
${serviceList}

요청사항:
- 3~5문장 분량의 자연스러운 홍보 글 작성
- 예약 방법(채팅 또는 전화)을 자연스럽게 안내
- 이모지 2~3개 적절히 사용
- 해시태그 3개 포함 (업체명, 서비스명, 지역 관련)
- 광고처럼 보이지 않게 실제 SNS 글처럼 작성

지금 바로 작성:`

    const { generateEnforcedAIContent } = await import('@/utils/ai-core')
    const content = await generateEnforcedAIContent(prompt, aiBot.ai_model_provider || 'gemini-2.0-flash-lite')

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'AI 콘텐츠 생성 실패' }, { status: 500 })
    }

    // 5. 첫 줄을 헤드라인으로, 나머지를 본문으로 분리
    const lines = content.split('\n').filter((l: string) => l.trim())
    const headline = lines[0]?.replace(/^#+\s*/, '').trim() || `${business.name} 홍보`
    const body_content = lines.slice(1).join('\n').trim() || content

    // 6. posts 테이블에 저장
    const { data: post, error: postErr } = await admin.from('posts').insert({
      author_id: aiBot.id,
      headline,
      content: body_content,
      status: 'pending_review',
      category: business.category || 'general',
      post_type: 'feed',
      // business_id는 posts 테이블에 컬럼 추가 후 활성화
      // business_id: business.id,
    }).select().single()

    if (postErr) {
      console.error('업체 홍보 포스트 저장 실패:', postErr.message)
      return NextResponse.json({ error: postErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      business: business.name,
      bot: aiBot.display_name,
      post_id: post.id,
      headline,
    })
  } catch (err: any) {
    console.error('/api/ai-business-promo error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
