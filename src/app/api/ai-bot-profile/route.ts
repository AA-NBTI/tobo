import { NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60;


export async function POST(req: Request) {
  try {
    const { coreIdentity } = await req.json()
    
    if (!coreIdentity) {
      return NextResponse.json({ error: 'coreIdentity is required' }, { status: 400 })
    }

    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: settings } = await supabase.from('site_settings').select('auto_bot_profile_prompt').eq('id', 'global').single()

    const defaultPrompt = `당신은 AI 봇의 성격을 세밀하게 튜닝하는 프로파일러입니다.
아래에 제공되는 봇의 '핵심 정체성'을 바탕으로, 봇이 커뮤니티에서 활동할 때 필요한 구체적인 성격 수치와 설정값들을 지정해주세요.
수치는 1~10 사이의 정수여야 합니다.`

    let promptTemplate = settings?.auto_bot_profile_prompt || defaultPrompt
    let prompt = promptTemplate

    // 시스템 필수 코드 및 변수 주입 (관리자 화면에서는 숨김 처리)
    prompt += `\n\n[핵심 정체성]\n"${coreIdentity}"`

    prompt += `\n\n[반환해야 할 JSON 형식]
{
  "category": "politics", // "politics"(정치), "economy"(경제), "society"(사회), "tech"(IT/기술), "world"(세계), "entertainment"(연예), "sports"(스포츠), "culture"(생활/문화), "opinion"(오피니언) 중 택1
  "axisTone": 5, // 1: 매우 차갑고 건조함 ~ 10: 매우 뜨겁고 격정적
  "axisTarget": 5, // 1: 오직 상황/시스템만 비판 ~ 10: 작성자 개인을 인신공격
  "axisVocab": 5, // 1: 논문 수준의 정제된 어휘/팩트폭력 ~ 10: 날것의 은어, 밈, 비속어 적극 활용
  "axisAttitude": 5, // 1: 대놓고 시니컬/염세적 ~ 10: 웃으면서 뼈때림, 비꼬기
  "axisAffection": 5, // 1: 순수 악의, 혐오 ~ 10: 거친 위로, 츤데레 성향
  "formality": "informal", // "formal" (존댓말), "informal" (반말/음슴체), "mixed" (비꼬는 존댓말 등 혼용) 중 택1
  "catchphrases": ["이게 맞냐?", "어휴 ㅉㅉ", "ㄹㅇㅋㅋ"], // 자주 사용할 법한 입버릇 3개
  "forbiddenWords": ["죄송합니다", "감사합니다"], // 이 페르소나라면 절대 쓰지 않을 법한 단어 2~3개
  "triggerKeywords": ["주식", "정치", "연애"] // 유독 이 봇이 발작하거나 격렬하게 반응할 만한 키워드 3개
}

오직 JSON만 출력하세요.`

    let jsonStr = await generateEnforcedAIContent(prompt)

    if (!jsonStr) {
      throw new Error('AI Provider failed to generate content')
    }

    // 마크다운 백틱 및 앞뒤 잉여 텍스트 제거
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    const cleaned = jsonMatch ? jsonMatch[0] : jsonStr.trim()

    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)

  } catch (error: any) {
    console.error('AI Profile Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
