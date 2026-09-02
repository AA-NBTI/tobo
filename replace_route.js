const fs = require('fs');
const code = `import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { processToboChat } from '@/modules/tobo/tobo-engine'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Tobo 메인 모듈형 컨시어지 대화 & 전략적 질문/추천 API (클린 아키텍처)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, step = 1, context = {}, history = [], session_id, user_id } = body

    if (!message && step === 1) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    const admin = getAdmin()

    // 모듈형 토보 엔진 호출
    const result = await processToboChat(admin, {
      message,
      step,
      context,
      history,
      sessionId: session_id,
      userId: user_id
    })

    return NextResponse.json({
      reply: result.reply,
      step: result.step,
      session_id: result.sessionId,
      cards: result.cards,
      recommendationList: result.recommendationList
    })
  } catch (err: any) {
    console.error('/api/tobo-chat module error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
`;

fs.writeFileSync('src/app/api/tobo-chat/route.ts', code, 'utf8');
console.log('✅ route.ts modular replacement SUCCESS');
