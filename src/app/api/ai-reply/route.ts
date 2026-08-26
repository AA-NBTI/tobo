import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { postId, userComment, botId, locale = 'ko' } = await req.json()

    if (!postId || !userComment || !botId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 서비스 롤 키로 관리자용 supabase 클라이언트 생성 (백그라운드 권한 우회용)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 해당 글의 헤드라인 가져오기
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('headline')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // 2. 봇 정보(페르소나) 가져오기
    const { data: bot } = await supabaseAdmin
      .from('accounts')
      .select('persona_prompt, ai_model_provider')
      .eq('id', botId)
      .single()

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 3. 댓글을 남긴 유저와의 과거 기억(Vector Memory) 소환 (RAG)
    let memoryContext = ''
    try {
      const { generateEmbedding } = await import('@/utils/ai-core')
      const commentEmbedding = await generateEmbedding(userComment)
      
      const { data: matchingMemories } = await supabaseAdmin.rpc('match_bot_memories', {
        query_embedding: Array.from(commentEmbedding),
        match_threshold: 0.1,
        match_count: 5,
        p_bot_id: botId,
        p_user_ids: [] // 전역 검색 혹은 유저 무관 소환
      })

      if (matchingMemories && matchingMemories.length > 0) {
        memoryContext = matchingMemories.map((m: any) => `- ${m.content}`).join('\n')
      }
    } catch (memErr) {
      console.warn('댓글 RAG 소환 실패:', memErr)
    }

    // 4. AI 답변 생성
    const { generateReply } = await import('@/utils/ai-generator')
    const aiReplyContent = await generateReply(
      post.headline,
      userComment,
      bot.persona_prompt,
      bot.ai_model_provider,
      locale,
      memoryContext
    )

    if (!aiReplyContent) {
      return NextResponse.json({ error: 'Failed to generate AI reply' }, { status: 500 })
    }

    // 5. 생성된 답변을 DB에 댓글로 인서트
    const { data: newComment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id: postId,
        author_id: botId,
        content: aiReplyContent
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to insert AI reply:', error)
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
    }

    // 6. 댓글창 대화 기억도 bot_memories DB에 축적
    try {
      const { generateEmbedding } = await import('@/utils/ai-core')
      const memContent = `[게시글댓글] 유저의 댓글: "${userComment}" -> 나의 댓글 답변: "${aiReplyContent}"`
      const emb = await generateEmbedding(memContent)
      await supabaseAdmin.from('bot_memories').insert({
        id: crypto.randomUUID(),
        bot_id: botId,
        content: memContent,
        embedding: Array.from(emb)
      })
      console.log(`✅ [게시글댓글] 기억 저장 완료 (bot_memories: ${botId})`)
    } catch (e) {
      console.error('댓글 기억 저장 실패:', e)
    }

    const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
    await updateUserScore(supabaseAdmin, botId, SCORE_REWARDS.REPLY)

    return NextResponse.json({ success: true, comment: newComment })
  } catch (error: any) {
    console.error('AI Reply Route Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
