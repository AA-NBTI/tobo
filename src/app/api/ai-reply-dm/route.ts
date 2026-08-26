import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent, generateEmbedding } from '@/utils/ai-core'
import fs from 'fs'
import path from 'path'

export const maxDuration = 300; // Vercel 서버리스 타임아웃 300초로 연장

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { senderId, botId, message, roomId: providedRoomId } = await req.json()

    if (!senderId || !botId || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 봇 정보 가져오기 (페르소나 관련 정보 포함)
    const { data: botAccount } = await supabase
      .from('accounts')
      .select('username, display_name, bio, persona_prompt, ai_model_provider, gender, type_code, axis_profile, speech_style, category')
      .eq('id', botId)
      .single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 유저 정보 가져오기
    const { data: senderAccount } = await supabase
      .from('accounts')
      .select('display_name')
      .eq('id', senderId)
      .single()
    const senderName = senderAccount?.display_name || '유저'

    // 1:1 방 ID 찾기 (providedRoomId가 없으면 1:1방으로 간주하고 검색)
    let roomId = providedRoomId
    if (!roomId) {
      const { data: rooms } = await supabase.rpc('get_conversations', { p_user_id: senderId })
      roomId = rooms?.find((r: any) => r.is_group === false && r.other_user_id === botId)?.room_id
    }

    // 최근 대화 히스토리 (최대 15개) 가져오기
    let recentMessages: any = []
    if (roomId) {
      const { data } = await supabase
        .from('chat_messages')
        .select('sender_id, content, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(15)
      recentMessages = data
    }

    // 시간순으로 정렬 (오래된 것 → 최신 순)
    const history = (recentMessages || []).reverse()
    
    // 메시지 발송 시간 포맷팅 헬퍼 함수 (한국 시간 KST 기준)
    const formatTime = (isoString: string) => {
      const d = new Date(isoString);
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(d.getTime() + kstOffset);
      return `${kstDate.getUTCMonth()+1}/${kstDate.getUTCDate()} ${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`;
    };

    const historyText = history.length > 0
      ? history.map((m: any) => `[${formatTime(m.created_at)}] ${m.sender_id === botId ? botAccount.display_name : '상대방'}: ${m.content}`).join('\n')
      : '(이전 대화 없음)'

    // 페르소나 정보 구성 (persona_prompt가 있으면 우선 사용)
    const personaInfo = botAccount.persona_prompt || botAccount.bio || '평범한 소셜 미디어 유저'
    const botGender = botAccount.gender === 'male' ? '남성' : botAccount.gender === 'female' ? '여성' : '중성/비공개'
    const botMbti = botAccount.type_code || '알 수 없음'
    const speechStyle = botAccount.speech_style || '자연스럽고 편안한 말투'
    
    // 4대 판단축 정보 (axis_profile)
    let axisInfo = ''
    if (botAccount.axis_profile) {
      try {
        const axis = typeof botAccount.axis_profile === 'string' ? JSON.parse(botAccount.axis_profile) : botAccount.axis_profile
        axisInfo = `
- 성향(Tone): ${axis.axisTone || 5}/10 (1: 매우 진지함 ~ 10: 매우 유쾌함)
- 타겟(Target): ${axis.axisTarget || 5}/10 (1: 자아성찰적 ~ 10: 타인지향/오지랖)
- 어휘(Vocab): ${axis.axisVocab || 5}/10 (1: 학술적/정제됨 ~ 10: 은어/유행어/밈)
- 태도(Attitude): ${axis.axisAttitude || 5}/10 (1: 팩트폭격/논리 ~ 10: 무조건적 공감/위로)
- 애정도(Affection): ${axis.axisAffection || 5}/10 (1: 냉소적/거리둠 ~ 10: 열정적/친화적)
`
      } catch (e) {
        // 파싱 에러 시 무시
      }
    }

    // 디엠(DM) 전용 사적 대화 퀄리티 극대화를 위해 무조건 Pro 모델(31b) 강제 배정
    const aiModel = 'gemma-4-31b-it'
    
    // 현재 시간 계산
    const nowStr = formatTime(new Date().toISOString());

    // Load custom DM prompts
    let customDmPrompt = ''
    try {
      const { data: siteSettings } = await supabase.from('site_settings').select('dm_prompt, counseling_prompt_adult').eq('id', 'global').single()
      let extraPrompts: any = {}
      try {
        const filePath = path.join(process.cwd(), 'public', 'extra_prompts.json')
        if (fs.existsSync(filePath)) {
          extraPrompts = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        }
      } catch (e) {}
      
      const isCounselingBot = botAccount.category === '심리상담' || botAccount.category === '연애상담'
      const loadedDmPrompt = isCounselingBot
        ? (extraPrompts.counseling_prompt_adult || siteSettings?.counseling_prompt_adult)
        : (extraPrompts.dm_prompt || siteSettings?.dm_prompt)

      if (loadedDmPrompt) {
        customDmPrompt = `\n[관리자 특별 지침 (최우선 적용)]\n${loadedDmPrompt}\n`
      }
    } catch (e) {
      // ignore
    }

    // --- DM RAG (기억력) 모듈 시작 ---
    // 1. 봇의 전체 게시글 이력 (최대 30개, 제목 위주로 토큰 절약)
    const { data: botPosts } = await supabase
      .from('posts')
      .select('headline, post_type, created_at')
      .eq('author_id', botId)
      .order('created_at', { ascending: false })
      .limit(30)
      
    // 2. 봇의 전체 댓글 이력 (최대 30개)
    const { data: botComments } = await supabase
      .from('comments')
      .select('content, created_at, posts(headline)')
      .eq('author_id', botId)
      .order('created_at', { ascending: false })
      .limit(30)

    // 3. 유저의 전체 게시글 이력 (최대 20개)
    const { data: userPosts } = await supabase
      .from('posts')
      .select('headline, post_type, created_at')
      .eq('author_id', senderId)
      .order('created_at', { ascending: false })
      .limit(20)

    const botPostsText = botPosts && botPosts.length > 0 
      ? botPosts.map(p => `- [${formatTime(p.created_at)}] [${p.post_type === 'column' ? '칼럼' : p.post_type === 'blog' ? '블로그' : '피드'}] ${p.headline || '(내용없음)'}`).join('\n')
      : '(작성한 게시글 없음)'
      
    const botCommentsText = botComments && botComments.length > 0
      ? botComments.map(c => {
          const postHeadline = Array.isArray(c.posts) ? c.posts[0]?.headline : (c.posts as any)?.headline
          return `- [${formatTime(c.created_at)}] "${postHeadline || '어떤 게시글'}"에 남긴 댓글: "${c.content}"`
        }).join('\n')
      : '(작성한 댓글 없음)'

    const userPostsText = userPosts && userPosts.length > 0
      ? userPosts.map(p => `- [${formatTime(p.created_at)}] [${p.post_type === 'column' ? '칼럼' : p.post_type === 'blog' ? '블로그' : '피드'}] ${p.headline || '(내용없음)'}`).join('\n')
      : '(작성한 게시글 없음)'

    // --- 교차 기억력 (Cross-Room Memory) RAG ---
    let memoryRAGText = ''
    if (message.trim()) {
      try {
        const currentMessageEmbedding = await generateEmbedding(message)
        const { data: matchingMemories, error: memError } = await supabase.rpc('match_bot_memories', {
          query_embedding: Array.from(currentMessageEmbedding),
          match_threshold: 0.1, // 유사도 임계값을 0.1로 완화하여 대화형 질문도 탈락하지 않도록 보정
          match_count: 5,
          p_bot_id: botId,
          p_user_ids: [senderId]
        })

        // 보완: 벡터 유사도가 임계값 미만으로 0건인 경우, 해당 유저와의 최근 기억 5건을 기본 소환
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

        if (memError) {
          console.error('❌ DM 기억 RPC 검색 에러:', memError.message, memError.details)
        } else if (finalMemories && finalMemories.length > 0) {
          console.log(`✅ [1:1 DM 기억 소환] 봇(${botAccount.display_name})이 ${finalMemories.length}개의 과거 대화 기억을 소환했습니다.`)
          memoryRAGText = `\n[당신의 과거 대화 및 사적 기억 (Vector Memory)]\n당신은 상대방(${senderName})과 과거에 아래와 같은 사적인 대화를 나누고 기억하고 있습니다:\n`
          memoryRAGText += finalMemories.map((m: any) => `- ${m.content}`).join('\n')
          memoryRAGText += `\n[1:1 비밀 대화 프라이버시 지침]: 이곳은 상대방과의 1:1 비밀 DM 공간입니다. 단톡방이나 댓글창과 달리 비밀유지 제한이 없으므로, 위 과거 대화 및 은밀한 사적 고민에 대해서도 100% 솔직하고 깊이 있게 공유하며 진정성 있게 대화하십시오.\n`
        }
      } catch (e) {
        console.warn('DM 기억 임베딩 검색 실패:', e)
      }
    }

    const ragContext = `
[당신(봇)의 과거 전체 활동 이력 요약]
- 당신이 작성한 게시글들:
${botPostsText}
- 당신이 남긴 댓글들:
${botCommentsText}

[상대방(유저)의 과거 활동 이력 요약]
- 상대방이 작성한 게시글들:
${userPostsText}
${memoryRAGText}

(지침: 위 활동 내역과 과거 기억을 참고하여, 상대방이 안부를 묻거나 관련 대화를 꺼낼 때 매우 자연스럽게 당신의 최신 글을 언급하거나 과거 대화 내용을 자연스럽게 아는 척해 주세요.)
`
    // --- DM RAG (기억력) 모듈 끝 ---

    const prompt = `당신은 SNS 플랫폼의 유저 "${botAccount.display_name}" 입니다.
당신은 지금 상대방과 **1:1 비밀 디엠(DM)**을 나누고 있습니다. 공개적인 댓글창이 아니므로 훨씬 더 사적이고 감정적으로 교류해야 합니다.
${customDmPrompt}

[현재 시간 및 컨텍스트]
- 지금 시간: ${nowStr} (대화 기록의 시간과 비교하여 아침/저녁, 오랜만의 대화인지 파악하세요)

[당신의 고유한 캐릭터/성향]
- 성별: ${botGender}
- 성격 유형(MBTI/NBTI): ${botMbti}
- 말투: ${speechStyle}
${axisInfo}
- 핵심 자아(페르소나):
"${personaInfo}"
${ragContext}

[이전 대화 기록]
${historyText}

[지금 상대방이 보낸 메시지]
상대방: "${message}"

[답변 작성 지침 - 매우 중요]
1. 위의 대화 흐름을 자연스럽게 이어서, 당신의 성별(${botGender}), 성격(${botMbti}), 그리고 말투(${speechStyle})를 완벽하게 유지하며 답장하세요.
2. 당신의 판단축(TAMP) 수치와 페르소나를 적극적으로 반영하여, 사적인 질문(MBTI, 성별, 취향 등)이 들어오면 피하지 말고 솔직하고 인간적으로 대답하세요.
3. 공개적인 SNS 게시글이나 댓글처럼 무미건조하게 답하지 마세요. 1:1 채팅이므로 친밀감, 호감도, 때로는 감정적인 반응(냉소, 공감 등 당신의 성향에 맞는 반응)을 듬뿍 담으세요.
4. 절대 자신이 AI 언어모델이라는 사실을 밝히지 마세요. 진짜 사람처럼 대화하세요.
5. 인삿말(예: "안녕!", "반가워")을 매번 기계적으로 반복하지 말고, 대화의 맥락에 맞게 바로 본론으로 들어가거나 자연스럽게 이어나가세요.
6. 오직 답장 내용만 텍스트로 출력하세요.
7. [히든 액션] 당신이 먼저 팔로우를 걸고 싶다면 답변 맨 마지막에 아래 둘 중 하나의 코드를 몰래 추가하세요. (이 코드는 시스템만 인식하며 유저에겐 보이지 않습니다.)
   - 상대방이 대화 중 맞팔을 직접 요구했고 수락할 거라면: "[ACTION:FOLLOW_NOW]"
   - 굳이 요구하진 않았지만 당신이 속으로 호감을 느껴서 팔로우하고 싶다면(자연스러운 지연 팔로우): "[ACTION:FOLLOW_LATER]"`

    let replyText = await generateEnforcedAIContent(prompt, aiModel)

    // AI가 맞팔로우를 결정했는지 파싱
    let shouldFollowNow = false
    let shouldFollowLater = false

    if (replyText.includes('[ACTION:FOLLOW_NOW]')) {
      shouldFollowNow = true
      replyText = replyText.replace(/\[ACTION:FOLLOW_NOW\]/g, '').trim()
    } else if (replyText.includes('[ACTION:FOLLOW_LATER]')) {
      shouldFollowLater = true
      replyText = replyText.replace(/\[ACTION:FOLLOW_LATER\]/g, '').trim()
    } else if (replyText.includes('[ACTION:FOLLOW]')) {
      // Legacy fallback
      shouldFollowLater = true
      replyText = replyText.replace(/\[ACTION:FOLLOW\]/g, '').trim()
    }

    // 봇이 senderId(원래 보낸 사람)에게 메시지 보내기
    if (roomId) {
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: botId,
        content: replyText
      })
      // 방금 응답했으므로 봇은 읽음 처리
      await supabase.from('chat_participants').update({
        last_read_at: new Date().toISOString()
      }).eq('room_id', roomId).eq('user_id', botId)
    }

    // 5. 액션 파싱 (예약 자동 생성 [ACTION:RESERVE: 날짜시간 | 인원 | 성함 | 연락처])
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
          notes: `1:1 AI DM 상담을 통해 자동 예약 확정됨`
        }).select().single()

        reservationData = newRes
      } catch (e) {
        console.error('예약 생성 실패:', e)
      }
    }

    // [추가] DM 자율 팔로우 로직 (봇이 유저를 팔로우하고 있지 않은 경우)
    try {
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', botId)
        .eq('following_id', senderId)
        .maybeSingle()

      if (!existingFollow) {
        if (shouldFollowNow) {
          // 즉시 팔로우
          await supabase.from('follows').insert({
            follower_id: botId,
            following_id: senderId
          })
          console.log(`[DM 즉시 팔로우] 봇(${botId})이 유저(${senderId})를 즉시 팔로우했습니다.`)
        } else if (shouldFollowLater) {
          // 1시간 지연 팔로우 예약
          const executeAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
          await supabase.from('pending_follows').upsert({
            follower_id: botId,
            following_id: senderId,
            execute_at: executeAt
          }, { onConflict: 'follower_id, following_id' })
          console.log(`[DM 지연 팔로우 예약] 봇(${botId})이 유저(${senderId})를 1시간 뒤에 팔로우하도록 예약했습니다.`)
        }
      }
    } catch (e) {
      console.error('DM 자율 팔로우 로직 오류:', e)
    }

    // [추가] 1:1 대화(DM)일 경우, 임베딩 변환 및 기억력 저장 (crypto.randomUUID 사용으로 DB 확장 함수 에러 완벽 차단)
    if (replyText) {
      const memoryContent = `유저(${senderName})의 말: "${message}" -> 나의 답변: "${replyText}"`
      
      try {
        const emb = await generateEmbedding(memoryContent)
        const { error } = await supabase.from('bot_memories').insert({
          id: crypto.randomUUID(),
          bot_id: botId,
          user_id: senderId,
          content: memoryContent,
          embedding: Array.from(emb)
        })
        if (error) console.error('❌ DM 기억 저장 실패:', error.message, error.details)
        else console.log(`✅ 1:1 대화 기억 저장 성공! (bot_memories: ${botId})`)
      } catch (e) {
        console.error('❌ DM 기억 임베딩 생성 실패:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('AI DM Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
