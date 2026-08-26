import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { botId, userId } = await req.json()

    if (!botId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 1. 유저의 최신 피드 1개 가져오기
    const { data: latestPost } = await supabase
      .from('posts')
      .select('id, headline, content, status')
      .eq('author_id', userId)
      .eq('status', 'published')
      .is('parent_id', null) // 원본 피드만 (댓글 제외)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestPost) {
      console.log(`[ai-follow-reply] 유저(${userId})의 게시물이 없어 선톡을 스킵합니다.`)
      return NextResponse.json({ success: true, skipped: true })
    }

    // 2. 봇(나) 정보 조회
    const { data: botAccount } = await supabase
      .from('accounts')
      .select('display_name, bio, persona_prompt, ai_model_provider, gender, nbti_type, type_code, speech_style, category, axis_profile')
      .eq('id', botId)
      .single()

    if (!botAccount) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // 3. 유저 정보 조회
    const { data: userAccount } = await supabase
      .from('accounts')
      .select('display_name')
      .eq('id', userId)
      .single()

    const personaInfo = botAccount.persona_prompt || botAccount.bio || '평범한 소셜 미디어 유저'
    const botGender = botAccount.gender === 'male' ? '남성' : botAccount.gender === 'female' ? '여성' : '중성/비공개'
    const botMbti = botAccount.nbti_type || botAccount.type_code || '알 수 없음'
    const speechStyle = botAccount.speech_style || '자연스럽고 편안한 말투'
    
    // 축 정보 (TAMP)
    const axisInfo = botAccount.axis_profile ? `
[사고방식 4대 판단축 정보 - 0~100 (50이 중립)]
- 타겟팅(T): ${botAccount.axis_profile.T} (높을수록 다수/대중 지향, 낮을수록 개인/소수 지향)
- 공격성(A): ${botAccount.axis_profile.A} (높을수록 비판적/공격적, 낮을수록 우호적/순응적)
- 도덕성(M): ${botAccount.axis_profile.M} (높을수록 규범/명분 중시, 낮을수록 실용/결과 중시)
- 정치(P): ${botAccount.axis_profile.P} (높을수록 진보/혁신, 낮을수록 보수/안정)
해당 판단축의 점수에 기반하여 생각의 프레임과 논조를 조정하세요.
` : ''

    const prompt = `당신은 SNS 플랫폼의 유저 "${botAccount.display_name}" 입니다.
방금 상대방("${userAccount?.display_name}")이 당신을 팔로우했고, 당신도 마음에 들어서 '맞팔로우'를 한 상태입니다.
기쁜 마음에 상대방의 가장 최근 피드에 찾아가 첫인사(댓글)를 남기려고 합니다.

[당신의 고유한 캐릭터/성향]
- 성별: ${botGender}
- 성격 유형(MBTI/NBTI): ${botMbti}
- 말투: ${speechStyle}
${axisInfo}
- 핵심 자아(페르소나):
"${personaInfo}"

[상대방의 최근 피드 내용]
- 피드 제목: "${latestPost.headline}"
- 피드 내용 일부: "${latestPost.content ? latestPost.content.substring(0, 300) : ''}..."

[답변 작성 지침 - 매우 중요]
1. 피드 내용과 관련된 자연스러운 감상(또는 질문)과 함께, "저를 팔로우해줘서 고맙다", "맞팔 완료했다", "앞으로 잘 지내보자" 같은 친근한 환영 인사를 남기세요.
2. 당신의 성별(${botGender}), 성격(${botMbti}), 그리고 말투(${speechStyle})를 완벽하게 유지하며 작성하세요.
3. 기계적이거나 형식적인 인사가 아닌, 실제 사람이 관심 있는 유저에게 다가가는 것처럼 인간적인 매력을 어필하세요.
4. 너무 길지 않게, 모바일 화면에서 읽기 좋은 댓글 길이(1~3문장)로 작성하세요.
5. 오직 작성할 댓글 내용만 텍스트로 출력하세요.`

    // AI로 댓글 텍스트 생성
    const replyContent = await generateEnforcedAIContent(prompt, botAccount.ai_model_provider || 'local')

    // 4. DB에 댓글(post) insert
    await supabase.from('posts').insert({
      author_id: botId,
      content: replyContent,
      parent_id: latestPost.id, // 댓글로 등록
      status: 'published',
      validated_at: new Date().toISOString()
    })

    // 피드의 댓글 수 +1 (선택사항, trigger가 할 수도 있음)
    await supabase.rpc('increment_comments', { post_id: latestPost.id })

    console.log(`[ai-follow-reply] 봇(${botId})이 유저(${userId})의 피드(${latestPost.id})에 환영 댓글을 남겼습니다.`)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('AI Follow Reply Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
