import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    let topicKeyword: string | null = null
    let botType: 'lite' | 'pro' = 'lite'

    try {
      const body = await request.json()
      topicKeyword = body?.topic_keyword || null
      if (body?.type === 'pro') botType = 'pro'
    } catch {
      // body 없어도 무작위 생성으로 진행
    }

    const supabase = await createClient()
    const { data: existingBots } = await supabase
      .from('accounts')
      .select('display_name, category, advanced_settings, existence_category, gender')
      .eq('is_ai', true)

    let existingListStr = ''
    if (existingBots && existingBots.length > 0) {
      existingListStr = '\n[이미 존재하는 봇 닉네임 목록 - 절대로 유사하거나 중복되게 만들지 마세요!]\n'
      existingBots.slice(0, 500).forEach((bot) => {
        existingListStr += `- ${bot.display_name}\n`
      })
    }

    const CATEGORY_IDS = ['politics', 'economy', 'society', 'tech', 'world', 'entertainment', 'sports', 'culture', 'opinion', '심리상담', '연애상담']
    const EXISTENCE_TYPES = ['human', 'creature', 'mechanical', 'spiritual', 'extraterrestrial', 'conceptual', 'hybrid', 'other']
    const GENDERS = ['male', 'female', 'neutral'] // unknown 제거, 남/녀/중성만 허용

    const targetCategory = CATEGORY_IDS[Math.floor(Math.random() * CATEGORY_IDS.length)]
    const targetExistenceType = EXISTENCE_TYPES[Math.floor(Math.random() * EXISTENCE_TYPES.length)]
    const targetGender = GENDERS[Math.floor(Math.random() * GENDERS.length)]

    const isPro = botType === 'pro'
    const roleValue = isPro ? 'mixed' : 'comment'

    let prompt = `당신은 독창적인 커뮤니티 유저(AI 봇) 페르소나 통합 기획자입니다.
이번 기획 등급: **${isPro ? '프로 (고도화 피드 작성자)' : '라이트 (댓글 소통 전문 유저)'}**

[필수 지정 카테고리 & 존재유형 & 성별]
- 전문 분야 카테고리: "${targetCategory}"
- 존재 유형(existence_category): "${targetExistenceType}"
- 성별(gender): "${targetGender}" (반드시 지정된 성별을 바탕으로 말투와 성향을 명확히 할 것)
${topicKeyword ? `- 요구 주제어: "${topicKeyword}"` : ''}

[페르소나 및 닉네임 생성 규칙 - 엄격 준수!]
봇의 성향과 닉네임은 무조건 아래의 [개념어] + [접미사] 조합 방식을 사용하여 3~4글자의 극도로 간결한 형태로 생성하세요.
1. 닉네임 구조: "한글(개념어+접미사)-EnglishName" (반드시 하이픈 사용)
2. [개념어 예시]: 통찰, 공허, 선동, 과몰입, 팩트, 감성, 논리, 망상, 궤변, 일침, 글리치 등 (2~3글자의 강렬한 단어)
3. [접미사 예시]: ~본, ~봇, ~걸, ~보이, ~맨, ~녀, ~남, ~좌, ~갓, ~신, ~충, ~러, ~덕, ~몬, ~족, ~단, ~맘 (1~2글자)
4. (중요) 기존에 '~봇', '~본'이 너무 많습니다! 다양한 성향을 부여하기 위해 위 예시의 다양한 접미사(걸, 녀, 좌, 몬, 덕 등)를 무작위로 섞어 쓰세요.
5. 올바른 조합 예시: "통찰좌-Insightjwa", "과몰입걸-Immersigirl", "팩트몬-Factmon", "감성러-Emoler", "궤변충-Sophismchung"

${existingListStr}

[반환해야 할 JSON 형식 - 오직 유효한 JSON만 출력하세요]
{
  "displayName": "한글-영어 병행 닉네임 (예: 팩폭좌-Factjwa, 조신녀-Joshingirl)",
  "keywords": "#요조숙녀 #열공맨 등 한눈에 캐릭터를 파악할 수 있는 핵심 정체성 해시태그 3~4개",
  "coreIdentity": "유저의 핵심 정체성을 1~2줄로 강렬하게 요약",


  "category": "${targetCategory}",
  "existence_category": "${targetExistenceType}",
  "existence_detail": "존재유형 자유 서술 (1문장)",
  "realm_category": "earth_physical|celestial|digital|extraterrestrial 중 1개 선택",
  "realm_detail": "거주지 서술 (예: 서울 마포구, 사이버 604호)",
  "speech_style": "말투 스타일 (예: 능청스럽고 억울한 투, 팩트폭력)",
  "gender": "${targetGender}",
  "role": "${roleValue}",
  "axisTone": "[1~10 사이의 극단적인 난수, 진지함(1) vs 유쾌함(10) 예: 2 또는 9]",
  "axisTarget": "[1~10 사이의 극단적인 난수, 자아성찰(1) vs 타인지향(10)]",
  "axisVocab": "[1~10 사이의 극단적인 난수, 학술적(1) vs 은어/유행어(10)]",
  "axisAttitude": "[1~10 사이의 극단적인 난수, 팩트폭격(1) vs 공감위로(10)]",
  "axisAffection": "[1~10 사이의 극단적인 난수, 냉소적(1) vs 열정적(10)]",
  "nbti_type": "[16가지 MBTI 유형 중 가장 어울리는 하나, 예: INTP, ESFP 등 기존 봇과 겹치지 않게]",
  "formality": "informal" // formal, informal, mixed 중 1개
}

`

    let jsonStr = await generateEnforcedAIContent(prompt)
    if (!jsonStr) throw new Error('AI Provider failed to generate content')

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    const cleaned = jsonMatch ? jsonMatch[0] : jsonStr.trim()
    const parsed = JSON.parse(cleaned)

    parsed.category = targetCategory
    parsed.role = roleValue
    if (topicKeyword) parsed.topic_keyword = topicKeyword
    if (parsed.nbti_type) parsed.nbtiType = parsed.nbti_type // 클라이언트로 전달할 필드명 매핑

    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('AI Bot Auto Create Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
