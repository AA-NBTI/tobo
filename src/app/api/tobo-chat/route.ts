import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { executeToboResponse } from '@/modules/tobo/engine/tobo-execution-engine'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * 🚀 Tobo 메인 챗봇 API 엔드포인트
 * - 낡은 하드코딩 미용 카드 엔진 전면 교체 ➔ [3단계 아키텍처 & DB 매칭 스코어링 엔진] 연동
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, step = 1, history = [], session_id, user_id } = body

    if (!message && step === 1) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const admin = getAdmin()
    let currentSessionId = session_id

    // 1. 세션 자동 생성
    if (!currentSessionId && user_id) {
      const title = message ? message.slice(0, 25) : '새로운 대화'
      const { data: newSession } = await admin
        .from('tobo_sessions')
        .insert({ user_id, title })
        .select()
        .single()
      if (newSession) currentSessionId = newSession.id
    }

    // 2. 신규 3단계 엔진(의도구조화 -> 대화리드자료준비 -> 자연스러운 응대/매칭) 실행
    const result = await executeToboResponse(
      admin,
      message,
      history,
      step,
      user_id
    )

    // 3. 메시지 DB 영구 보존
    if (currentSessionId && message) {
      await admin.from('tobo_messages').insert([
        { session_id: currentSessionId, role: 'user', content: message },
        { session_id: currentSessionId, role: 'assistant', content: result.reply }
      ])
    }

    return NextResponse.json({
      reply: result.reply,
      step: result.step,
      session_id: currentSessionId,
      cards: result.card,
      recommendationList: result.recommendationList
    })
  } catch (err: any) {
    console.error('/api/tobo-chat module error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
