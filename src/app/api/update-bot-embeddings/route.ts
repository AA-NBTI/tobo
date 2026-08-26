import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const maxDuration = 60

/**
 * POST /api/update-bot-embeddings
 *
 * 페르소나 임베딩이 없거나 오래된 봇들의 임베딩을 일괄 생성합니다.
 * 관리자 전용 엔드포인트 (CRON_SECRET 헤더로 보호)
 *
 * Body: { forceAll?: boolean }  // true이면 기존 임베딩도 전부 재생성
 */
export async function POST(request: Request) {
  try {
    // 인증 확인: CRON_SECRET/SERVICE_ROLE_KEY 헤더 또는 로그인된 관리자 세션
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
    const isHeaderAuthed = Boolean(expectedSecret && authHeader === `Bearer ${expectedSecret}`)

    let isAdminAuthed = false
    if (!isHeaderAuthed) {
      try {
        const { createClient: createServerClient } = await import('@/utils/supabase/server')
        const { isAdmin } = await import('@/utils/auth')
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isAdmin(user)) {
          isAdminAuthed = true
        }
      } catch (_) {}
    }

    if (!isHeaderAuthed && !isAdminAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let forceAll = false
    try {
      const body = await request.json()
      forceAll = body?.forceAll === true
    } catch (_) {}

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 임베딩이 없는 봇만 조회 (forceAll이면 전체 조회)
    let query = supabaseAdmin
      .from('accounts')
      .select('id, display_name, persona_prompt')
      .eq('is_ai', true)

    if (!forceAll) {
      query = query.is('persona_embedding', null)
    }

    const { data: bots, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!bots || bots.length === 0) {
      return NextResponse.json({ message: '모든 봇의 임베딩이 최신 상태입니다.', updated: 0 })
    }

    const { generateEmbedding } = await import('@/utils/embedding')

    let updated = 0
    const errors: string[] = []

    for (const bot of bots) {
      if (!bot.persona_prompt) {
        console.warn(`[update-bot-embeddings] ${bot.display_name}: persona_prompt 없음, 스킵`)
        continue
      }

      try {
        console.log(`[update-bot-embeddings] ${bot.display_name} 임베딩 생성 중...`)
        const embedding = await generateEmbedding(bot.persona_prompt)

        await supabaseAdmin
          .from('accounts')
          .update({
            persona_embedding: JSON.stringify(embedding),
            persona_embedding_updated_at: new Date().toISOString(),
          })
          .eq('id', bot.id)

        updated++
        console.log(`[update-bot-embeddings] ✅ ${bot.display_name} 완료`)

        // API 쿼터 보호: 봇 간 300ms 간격
        await new Promise(r => setTimeout(r, 300))
      } catch (err: any) {
        console.error(`[update-bot-embeddings] ❌ ${bot.display_name} 실패:`, err)
        errors.push(`${bot.display_name}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      total: bots.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[update-bot-embeddings] 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
