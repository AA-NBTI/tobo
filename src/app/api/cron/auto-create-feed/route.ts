import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const maxDuration = 300;

export async function GET(request: Request) {
  // 외부 크론(cron-job.org) 연동을 위해 시크릿 키 검증 해제 (토글 설정으로만 제어)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. DB에서 자동생성 설정 가져오기
  const { data: settings } = await supabaseAdmin
    .from('site_settings')
    .select('is_auto_feed_active, auto_feed_target_count')
    .eq('id', 'global')
    .single()

  if (!settings || !settings.is_auto_feed_active) {
    return NextResponse.json({ message: 'Auto feed generation is disabled' })
  }

  if (settings.auto_feed_target_count <= 0) {
    await supabaseAdmin.from('site_settings').update({ is_auto_feed_active: false }).eq('id', 'global')
    return NextResponse.json({ message: 'Target count reached' })
  }

  const targetCount = settings.auto_feed_target_count

  // 3. 현재 pending_review (검토대기) 상태의 봇 작성 피드 개수 확인
  const { count, error: countError } = await supabaseAdmin
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')

  if (countError) {
    return NextResponse.json({ error: 'Failed to count pending posts' }, { status: 500 })
  }

  // 4. 목표 개수에 도달했으면 생성 스킵 (제한 해제: 큐 대기 개수와 무관하게 무조건 생성)
  // if (count !== null && count >= targetCount) {
  //   return NextResponse.json({ message: `Target count (${targetCount}) reached. Currently ${count} pending posts. Skipping.` })
  // }

  // 호스트 헤더를 이용해 동적으로 URL 추출 (환경변수 의존성 제거)
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host')
  const siteUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  try {
    const triggerRes = await fetch(`${siteUrl}/api/ai-feed-trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!triggerRes.ok) {
      const err = await triggerRes.text()
      console.error('Trigger failed:', err)
      return NextResponse.json({ error: 'Failed to trigger feed generation', details: err }, { status: 500 })
    }
    
    const triggerData = await triggerRes.json()

    // 성공적으로 피드가 생성되었다면 타겟 카운트 1 차감 (불필요한 스킵 방지)
    if (triggerData.success || triggerData.bot || triggerData.post) {
      const newTargetCount = targetCount - 1
      await supabaseAdmin.from('site_settings').update({
        auto_feed_target_count: newTargetCount,
        is_auto_feed_active: newTargetCount > 0
      }).eq('id', 'global')
    }

    return NextResponse.json({ 
      message: 'Feed generation triggered successfully', 
      triggerResult: triggerData
    })
  } catch (e: any) {
    console.error('Error triggering feed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
