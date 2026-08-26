import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent, generateEmbedding } from '@/utils/ai-core'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { botId, senderId, roomId, message, senderName = '참여자', aiModel, forceReply = false } = body

    if (!botId || !senderId || !roomId || !message) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. 방 및 AI 봇 정보 조회
    const { data: botAccount } = await supabase.from('accounts').select('*').eq('id', botId).single()
    const { data: roomData } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot account not found' }, { status: 404 })
    }

    // 2. 단톡방 참여자 목록
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id, accounts(display_name)')
      .eq('room_id', roomId)

    const participantNames = participants?.map((p: any) => p.accounts?.display_name).filter(Boolean).join(', ') || ''
    const participantUserIds = participants?.map((p: any) => p.user_id) || []

    // 3. Vector RAG 메모리 검색 (Cross-room 기억 포함)
    let memoryRAGText = ''
    try {
      const queryEmbedding = await generateEmbedding(message)
      const { data: matchingMemories } = await supabase.rpc('match_bot_memories', {
        query_embedding: queryEmbedding,
        match_threshold: 0.15,
        match_count: 5,
        p_bot_id: botId,
        p_user_ids: participantUserIds
      })

      if (matchingMemories && matchingMemories.length > 0) {
        memoryRAGText = `\n[단톡방 참여자들과의 관련 기억 (Vector Memory)]\n`
        memoryRAGText += matchingMemories.map((m: any) => `- ${m.content}`).join('\n')
        memoryRAGText += `\n`
      }
    } catch (e) {
      console.warn('⚠️ [Group RAG] 기억 검색 실패:', e)
    }

    // 4. 최근 대화 기록
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('sender_id, content, accounts(display_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(10)

    const historyText = recentMessages?.reverse().map((m: any) => {
      const name = m.accounts?.display_name || (m.sender_id === botId ? botAccount.display_name : '사용자')
      return `${name}: ${m.content}`
    }).join('\n') || ''

    // 5. 프롬프트 구성 (단톡방 상담 및 스킵 조건 포함)
    const prompt = `당신은 예약 상담 및 안내 AI 매니저 "${botAccount.display_name}"입니다.
현재 "${roomData?.name || '단체 예약 상담방'}" 단톡방에 참여 중입니다.

[참여자 목록: ${participantNames}]
${memoryRAGText}

[핵심 조건]
${forceReply 
  ? '당신이 방금 언급되었거나 직접 호출되었습니다. 친절하고 가치 있는 예약/매장 안내 답변을 작성하세요.' 
  : '만약 메시지가 당신(AI 매니저)에게 질문하거나 예약 관련 문의가 아니라 다른 사람들끼리의 사적인 대화라면, 아무 말도 하지 말고 정확히 "[SKIP]"이라고만 답변하세요.'}

[AI 매니저 정보]
- 이름: ${botAccount.display_name}
- 스타일: ${botAccount.speech_style || '전문적이고 친절함'}

[최근 대화 기록]
${historyText}

[방금 들어온 메시지]
"${senderName}": "${message}"
`

    let replyText = await generateEnforcedAIContent(prompt, aiModel)

    if (!forceReply && replyText.includes('[SKIP]')) {
      return NextResponse.json({ skipped: true })
    }

    replyText = replyText.replace(/^["']|["']$/g, '').trim()

    // 6. 답변 메시지 저장
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: botId,
      content: replyText
    })

    // 7. RAG 기억 저장
    if (replyText) {
      const memoryContent = `[단톡방: ${roomData?.name || '상담방'}] ${senderName}: "${message}" -> AI 매니저: "${replyText}"`
      try {
        const emb = await generateEmbedding(memoryContent)
        await supabase.from('bot_memories').insert({
          bot_id: botId,
          user_id: senderId,
          content: memoryContent,
          embedding: Array.from(emb)
        })
      } catch (e) {
        console.error('Group Memory 저장 실패:', e)
      }
    }

    return NextResponse.json({ success: true, reply: replyText })
  } catch (error: any) {
    console.error('AI Group Chat Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
