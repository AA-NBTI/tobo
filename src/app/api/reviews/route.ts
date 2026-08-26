import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 리뷰 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    const admin = getAdmin()
    let query = admin
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })

    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    const { data: reviews, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 리뷰 등록 및 AI 점주 자동 답글 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessId, reservationId, authorName, rating, content, userId } = body

    if (!businessId || !authorName || !content || !rating) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
    }

    const admin = getAdmin()

    // 1. 업체 정보 및 점주 봇 정보 조회
    const { data: business } = await admin
      .from('businesses')
      .select('name, category, description, accounts!businesses_owner_id_fkey(display_name, ai_model_provider, persona_prompt)')
      .eq('id', businessId)
      .single()

    const ownerBot = Array.isArray(business?.accounts) ? business?.accounts[0] : (business?.accounts as any)

    // 2. AI 점주의 자동 감사 답글 생성
    let aiReply = null
    try {
      const botModel = ownerBot?.ai_model_provider || 'gemini-2.0-flash-lite'
      const botName = ownerBot?.display_name || `${business?.name || '업체'} 매니저`
      const persona = ownerBot?.persona_prompt || '친절하고 고객 중심적인 서비스 점주'

      const prompt = `당신은 '${business?.name || '매장'}'의 점주/매니저 '${botName}'입니다.
페르소나: ${persona}

고객이 다음과 같은 방문 리뷰를 남겼습니다:
- 작성자: ${authorName}
- 별점: ${rating}점 / 5점
- 리뷰 내용: "${content}"

요청사항:
- 고객의 별점과 리뷰 내용에 진심 어린 감사를 표하거나(좋은 평점일 경우), 불편함에 공감하고 개선을 약속하는(낮은 평점일 경우) 2~3문장의 따뜻하고 정중한 답글을 작성하세요.
- 매장 이름을 자연스럽게 언급하세요.
- 불필요한 설명 없이 오직 답글 본문만 출력하세요.`

      aiReply = await generateEnforcedAIContent(prompt, botModel)
      if (aiReply) aiReply = aiReply.trim()
    } catch (aiErr) {
      console.error('AI 점주 리뷰 답글 생성 실패:', aiErr)
    }

    // 3. 리뷰 저장
    const { data: newReview, error } = await admin
      .from('reviews')
      .insert({
        business_id: businessId,
        reservation_id: reservationId || null,
        user_id: userId || null,
        author_name: authorName,
        rating: Number(rating),
        content,
        ai_reply: aiReply
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 4. 예약 정보가 연결되어 있으면 reservation 상태 갱신
    if (reservationId) {
      await admin
        .from('reservations')
        .update({ review_id: newReview.id })
        .eq('id', reservationId)
    }

    return NextResponse.json({ success: true, review: newReview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
