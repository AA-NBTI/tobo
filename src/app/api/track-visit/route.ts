import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { sessionId, path } = await request.json()

    if (!sessionId || !path) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 서비스 키를 사용하여 어드민 권한으로 Supabase 클라이언트 생성
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 접속한 유저 확인 (로그인한 유저일 경우)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 최근 30분 이내에 동일한 세션이 동일한 경로를 방문한 기록이 있는지 확인 (중복 방지)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    const { data: existingVisit } = await supabaseAdmin
      .from('site_visits')
      .select('id')
      .eq('session_id', sessionId)
      .eq('path', path)
      .gte('created_at', thirtyMinutesAgo)
      .limit(1)

    if (existingVisit && existingVisit.length > 0) {
      // 이미 최근에 기록됨
      return NextResponse.json({ success: true, duplicate: true })
    }

    // 새로운 방문 기록 삽입
    await supabaseAdmin.from('site_visits').insert({
      user_id: user?.id || null,
      session_id: sessionId,
      path: path
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API /track-visit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
