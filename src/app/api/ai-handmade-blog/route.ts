import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText } from 'ai'

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { botId, keyword, coreKeyword, mediumKeyword, blueOceanKeyword } = await req.json()

    if (!botId || !keyword) {
      return NextResponse.json({ error: 'botId and keyword are required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch bot persona
    const { data: bot } = await supabaseAdmin
      .from('accounts')
      .select('display_name, persona_prompt, ai_model_provider')
      .eq('id', botId)
      .single()

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('API key missing')
    
    const google = createGoogleGenerativeAI({ apiKey })
    
    // Choose model
    const modelId = 'gemma-4-31b-it'

    const systemPrompt = `당신은 대한민국 최고의 SEO 마케팅 블로거이자, 페르소나 연기 전문가입니다.
다음 페르소나 설정에 완전히 빙의하여, 타겟 키워드가 완벽히 최적화된 마크다운(Markdown) 형식의 장문 블로그 글을 작성하세요.

[현재 시스템 정보]
오늘 날짜는 ${new Date().toLocaleDateString('ko-KR')} 입니다. 모든 정보는 이 시점을 기준으로 최신 정보인 것처럼 작성하세요.

[당신의 페르소나]
${bot.persona_prompt || '친절하고 전문적인 블로거'}

[SEO 타겟 키워드]
핵심 메인 키워드(제목): "${keyword}"
보조 핵심 키워드: "${coreKeyword || ''}"
중간 검색량 연관 키워드: "${mediumKeyword || ''}"
블루오션(틈새) 전략 키워드: "${blueOceanKeyword || ''}"

[종합 SEO 점수 100점 달성을 위한 필수 지침 - 반드시 지킬 것!]
1. 제목(H1): 글의 맨 처음은 반드시 "# ${keyword}" 형식으로 시작하여, 타겟 키워드(제목)를 토씨 하나 바꾸지 않고 완벽히 동일하게 작성하세요.
2. 도입부 키워드: 첫 번째 문단(시작 100자 이내)에 핵심 메인 키워드를 자연스럽게 노출하세요.
3. 블루오션 키워드 전략: 제공된 '블루오션 전략 키워드(${blueOceanKeyword || ''})' 및 '중간 검색량 키워드(${mediumKeyword || ''})'를 파생시켜 문맥에 맞게 2~3회 이상 섞어서 반복 사용하세요.
4. 소제목 계층화: 글 전체를 3개 이상의 소제목("## ")으로 나누어 논리적으로 전개하세요.
5. 가독성(스캐너블): 모바일에서도 읽기 편하게 문단을 짧게 쪼개세요. 무조건 모든 문단 사이, 리스트(- )의 각 항목 사이, 소제목(##) 위아래에는 빈 줄(\\n\\n)을 넣어 줄간격을 크게 띄우세요. 줄이 붙어있으면 안 됩니다.
6. 유튜브 링크 자동 삽입: 본문의 맨 마지막 줄에는 반드시 아래의 마크다운 링크를 그대로 붙여넣어 첨부하세요.
[🎥 관련 유튜브 영상 더 찾아보기](https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)})
7. 내부 링크: 존재하지 않는 가상의 링크를 억지로 만들지 말고, 문맥에 맞는 해시태그(#키워드)를 사용하세요.
8. 외부 링크: 반드시 실제로 존재하는 공신력 있는 외부 출처의 URL만 사용하세요. 불확실하면 아예 생략하세요.
9. 기계적 말투 금지: "결론적으로 말하자면", "요약하자면", "오늘은 ~에 대해 알아보았습니다" 같은 스팸성 멘트를 절대 사용하지 말고, 사람 냄새 나는 페르소나 말투를 듬뿍 담아내세요.

위 지침들을 모두 반영하여, 마크다운 코드블록(\`\`\`) 없이 본문 내에 절대로 '[이미지: xxx]'와 같은 플레이스홀더를 넣지 말고 순수한 마크다운 텍스트만 출력하세요.`

    const result = streamText({
      model: google(modelId),
      prompt: systemPrompt,
      maxRetries: 1,
    })

    return result.toTextStreamResponse()

  } catch (error: any) {
    console.error('SEO Blog Generation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
