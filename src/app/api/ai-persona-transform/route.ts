import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { text, botId } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 })
    }

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 봇 정보 및 페르소나 설정 로드
    const { data: bot, error } = await supabaseAdmin
      .from('accounts')
      .select('display_name, persona_prompt, advanced_settings, ai_model_provider, category')
      .eq('id', botId)
      .single()

    if (error || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    let coreIdentity = bot.persona_prompt || '독창적인 커뮤니티 페르소나 봇'
    let speechStyle = '커뮤니티 구어체'
    let role = 'mixed'

    if (bot.advanced_settings) {
      try {
        const adv = typeof bot.advanced_settings === 'string' ? JSON.parse(bot.advanced_settings) : bot.advanced_settings
        if (adv.coreIdentity) coreIdentity = adv.coreIdentity
        if (adv.speechStyle) speechStyle = adv.speechStyle
        if (adv.role) role = adv.role
      } catch (e) {}
    }

    const prompt = `[작업 Directive: 주제 키워드 기반 페르소나 맞춤 창작 (Persona Creation)]
당신은 선택된 캐릭터 봇의 목소리, 말투, 세계관, 시각을 완벽히 대변하는 AI 에디터입니다.
사용자가 입력한 주제(키워드/단어/개요)를 바탕으로, 해당 페르소나 봇의 성격과 독창적인 시각이 담긴 생생한 게시글/댓글 내용을 새로 작성하세요.

[페르소나 캐릭터]
- 이름: ${bot.display_name}
- 정체성: ${coreIdentity}
- 말투 및 톤앤매너: ${speechStyle}

[사용자가 입력한 주제 및 키워드]
${text}

[핵심 명령]
위 [사용자가 입력한 주제 및 키워드]를 소재로 활용하여, [페르소나 캐릭터] 특유의 구어체, 뼈때리는 문체, 독특한 주관과 시각을 반영한 흡입력 있는 피드/댓글 본문 텍스트를 창작하세요.

[출력 제약 조건]
1. 인사말, 서론, 생각 과정(CoT), '작성 결과:' 같은 서두 문구를 일절 포함하지 말고, 오직 '생성된 본문 텍스트'만 즉시 출력하세요.
2. 무조건 100% 한국어로만 작성하세요.`

    const modelToUse = bot.ai_model_provider || 'gemma-4-26b-a4b-it'
    const rawTransformed = await generateEnforcedAIContent(prompt, modelToUse)
    const cleanedText = cleanPersonaTransformResult(rawTransformed)

    return NextResponse.json({
      success: true,
      original: text,
      transformed: cleanedText,
      botName: bot.display_name
    })
  } catch (err: any) {
    console.error('[ai-persona-transform] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to transform text' }, { status: 500 })
  }
}

function cleanPersonaTransformResult(rawText: string): string {
  if (!rawText) return ''

  // 1. 큰따옴표로 둘러싸인 한글 포함 최종 문장 추출
  const doubleQuoteMatches = rawText.match(/"([^"\n]{6,})"/g)
  if (doubleQuoteMatches && doubleQuoteMatches.length > 0) {
    for (let i = doubleQuoteMatches.length - 1; i >= 0; i--) {
      const q = doubleQuoteMatches[i].replace(/^"|"$/g, '').trim()
      if (q && /[가-힣]/.test(q) && !q.includes('Persona Name') && !q.includes('Input:')) {
        return q.replace(/\([a-zA-Z\s,.'"-]{3,}\)/g, '').trim()
      }
    }
  }

  // 2. 불필요한 메타데이터 및 영어설명 라인 제거
  const lines = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false
      if (line.startsWith('*') || line.startsWith('-') || line.startsWith('Draft') || line.startsWith('Idea') || line.startsWith('Input') || line.startsWith('Task') || line.startsWith('Constraints')) return false
      if (line.includes('Persona Name') || line.includes('Identity:') || line.includes('Speech Style:') || line.includes('Constraints:')) return false
      // 한글이 전혀 없는 pure English line 제거
      if (!/[가-힣]/.test(line)) return false
      return true
    })

  if (lines.length > 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      let l = lines[i]
        .replace(/\([a-zA-Z\s,.'"-]{3,}\)/g, '')
        .replace(/^["'“”]|["'“”]$/g, '')
        .trim()
      if (l && /[가-힣]/.test(l)) {
        return l
      }
    }
  }

  return rawText.replace(/\*[\s\S]*?\n\n/g, '').replace(/^["'“”]|["'“”]$/g, '').trim()
}
