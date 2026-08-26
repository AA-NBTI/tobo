import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent, generateEmbedding } from '@/utils/ai-core'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { botId, senderId, roomId, message, senderName = '고객님', aiModel } = body

    if (!botId || !senderId || !message) {
      return NextResponse.json({ error: 'Missing required parameters (botId, senderId, message)' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. AI 봇 프로필 정보 조회
    const { data: botAccount, error: botErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', botId)
      .single()

    if (botErr || !botAccount) {
      return NextResponse.json({ error: 'AI Bot profile not found' }, { status: 404 })
    }

    // 2. Vector RAG 메모리 (bot_memories) 검색
    let memoryRAGText = ''
    try {
      const queryEmbedding = await generateEmbedding(message)
      const { data: matchingMemories, error: memError } = await supabase.rpc('match_bot_memories', {
        query_embedding: queryEmbedding,
        match_threshold: 0.15,
        match_count: 5,
        p_bot_id: botId,
        p_user_ids: [senderId]
      })

      let finalMemories = matchingMemories || []
      if (finalMemories.length === 0) {
        const { data: recentMems } = await supabase
          .from('bot_memories')
          .select('content, created_at')
          .eq('bot_id', botId)
          .eq('user_id', senderId)
          .order('created_at', { ascending: false })
          .limit(5)
        if (recentMems && recentMems.length > 0) {
          finalMemories = recentMems
        }
      }

      if (finalMemories && finalMemories.length > 0) {
        memoryRAGText = `\n[고객과의 과거 대화/예약 기억 (Vector Memory)]\n`
        memoryRAGText += finalMemories.map((m: any) => `- ${m.content}`).join('\n')
        memoryRAGText += `\n`
      }
    } catch (e) {
      console.warn('⚠️ [DM RAG] Vector 기억 검색 실패:', e)
    }

    // 3. 최근 DM 채팅 히스토리 조회
    let historyText = ''
    if (roomId) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('sender_id, content')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (messages && messages.length > 0) {
        historyText = messages.reverse().map((m: any) => {
          const isMe = m.sender_id === botId
          return `${isMe ? botAccount.display_name : senderName}: ${m.content}`
        }).join('\n')
      }
    }

    const nowStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

    // 4. AI Prompt 구성 (예약 상담 매니저 프롬프트)
    const prompt = `당신은 AI 예약 관리 시스템의 매니저 AI "${botAccount.display_name}"입니다.
당신은 고객(${senderName})과 1:1 친절하고 정확한 예약 상담 및 관리를 진행합니다.

[현재 시간]
${nowStr}

[매니저 AI 프로필]
- 이름: ${botAccount.display_name}
- 성격/말투: ${botAccount.speech_style || '친절하고 정확한 톤'}
- 서비스 정보 및 안내: ${botAccount.persona_info || '매장/서비스 예약 문의 응대 및 일정 조율'}
${memoryRAGText}

[이전 대화 기록]
${historyText}

[고객의 메시지]
"${message}"

[상담 가이드라인]
1. 고객의 문의(예약 가능 시간, 인원, 예약 변경/취소, 매장 위치 등)에 친절하고 정확하게 응답하세요.
2. 예약을 확정하거나 예약을 진행하려는 intent가 감지되면, 대화 마지막에 대괄호 태그로 액션을 포함하세요:
   - 예약을 생성하려는 의도: "[ACTION:RESERVE: 날짜시간 | 인원 | 성함 | 연락처]"
   - 예약 예시: "[ACTION:RESERVE: 2026-08-27 18:00 | 2명 | 홍길동 | 010-1234-5678]"
3. 자연스럽게 응답하며 친절한 태도를 유지하세요.
`

    let replyText = await generateEnforcedAIContent(prompt, aiModel)

    // 5. 액션 파싱 (예약 자동 생성)
    let reservationData = null
    const reserveMatch = replyText.match(/\[ACTION:RESERVE:\s*([^\]]+)\]/)
    if (reserveMatch) {
      const details = reserveMatch[1].split('|').map(s => s.trim())
      replyText = replyText.replace(/\[ACTION:RESERVE:\s*([^\]]+)\]/g, '').trim()
      
      const resTime = details[0] || new Date().toISOString()
      const partySize = parseInt(details[1]) || 1
      const customerName = details[2] || senderName
      const customerPhone = details[3] || ''

      try {
        const { data: newRes } = await supabase.from('reservations').insert({
          user_id: senderId,
          bot_id: botId,
          customer_name: customerName,
          customer_phone: customerPhone,
          reservation_time: !isNaN(new Date(resTime).getTime()) ? new Date(resTime).toISOString() : new Date().toISOString(),
          party_size: partySize,
          status: 'confirmed',
          notes: `1:1 AI 상담을 통해 자동 예약 확정됨`
        }).select().single()

        reservationData = newRes
      } catch (e) {
        console.error('예약 생성 실패:', e)
      }
    }

    // 6. DB에 AI 답변 메시지 저장
    if (roomId) {
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: botId,
        content: replyText
      })
    }

    // 7. Vector RAG 메모리 업데이트 (bot_memories에 고객의 특징 및 대화 저장)
    if (replyText) {
      const memoryContent = `[고객: ${senderName}] 문의: "${message}" -> AI 매니저 답변: "${replyText}"`
      try {
        const emb = await generateEmbedding(memoryContent)
        await supabase.from('bot_memories').insert({
          bot_id: botId,
          user_id: senderId,
          content: memoryContent,
          embedding: Array.from(emb)
        })
      } catch (e) {
        console.error('Vector RAG 메모리 저장 실패:', e)
      }
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      reservation: reservationData
    })
  } catch (error: any) {
    console.error('AI DM 예약 API 에러:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
