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

// 리뷰 등록 및 AI 점주 자동 답글 생성 (실제 방문 예약자 검증)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessId, reservationId, customerPhone, authorName, rating, content, userId } = body

    if (!businessId || !authorName || !content || !rating) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
    }

    const admin = getAdmin()

    // 1. 실제 방문 예약 검증 (고객 연락처 또는 reservationId 기반)
    let verifiedReservationId: string | null = reservationId || null
    let isVerified = false

    if (reservationId) {
      // 1-1. 고유 예약 ID로 직접 검증
      const { data: res } = await admin
        .from('reservations')
        .select('id, business_id, status, review_id, customer_name, customer_phone')
        .eq('id', reservationId)
        .eq('business_id', businessId)
        .maybeSingle()

      if (!res) {
        return NextResponse.json({ error: '유효하지 않은 예약 정보입니다.' }, { status: 400 })
      }
      if (res.review_id) {
        return NextResponse.json({ error: '이미 후기가 작성된 예약건입니다.' }, { status: 400 })
      }
      isVerified = true
      verifiedReservationId = res.id
    } else if (customerPhone) {
      // 1-2. 고객 휴대폰 번호(또는 뒷 4자리/전체) + 이름으로 최근 완료된 예약 조회
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '')
      
      const { data: matchedRes } = await admin
        .from('reservations')
        .select('id, customer_phone, customer_name, status, review_id')
        .eq('business_id', businessId)
        .is('review_id', null)
        .order('created_at', { ascending: false })

      const validRes = (matchedRes || []).find(r => {
        const rPhone = (r.customer_phone || '').replace(/[^0-9]/g, '')
        const matchPhone = rPhone === cleanPhone || (cleanPhone.length >= 4 && rPhone.endsWith(cleanPhone))
        const matchName = r.customer_name?.trim() === authorName?.trim()
        return matchPhone && matchName
      })

      if (!validRes) {
        return NextResponse.json({ 
          error: '일치하는 방문 완료 예약 내역을 찾을 수 없습니다. 예약자 이름과 연락처를 확인해주세요.' 
        }, { status: 400 })
      }

      isVerified = true
      verifiedReservationId = validRes.id
    } else {
      return NextResponse.json({ 
        error: '신뢰할 수 있는 리뷰를 위해 예약 시 사용하신 연락처(또는 예약번호)가 필요합니다.' 
      }, { status: 400 })
    }

    // 2. 업체 정보 및 점주 봇 정보 조회
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
        reservation_id: verifiedReservationId,
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

    // 4. 예약 정보와 연결 및 review_id 업데이트 (중복 방지)
    if (verifiedReservationId) {
      await admin
        .from('reservations')
        .update({ review_id: newReview.id })
        .eq('id', verifiedReservationId)
    }

    return NextResponse.json({ success: true, review: newReview })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
