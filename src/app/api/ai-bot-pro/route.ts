import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'

function extractJson(str: string): string {
  const start = str.indexOf('{')
  const end = str.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    return str.substring(start, end + 1)
  }
  return str
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { step, coreIdentity, script, params, topic_keyword } = body

    const supabase = await createClient()

    const { data: settings } = await supabase.from('site_settings').select('*').eq('id', 'global').single()

    // Step 1: Concept
    if (step === 1) {
      const { data: existingBots } = await supabase
        .from('accounts')
        .select('display_name, category, advanced_settings, existence_category, gender')
        .eq('is_ai', true)
        
      const CATEGORY_IDS = ['politics', 'economy', 'society', 'tech', 'world', 'entertainment', 'sports', 'culture', 'opinion']
      const categoryCounts: Record<string, number> = {}
      CATEGORY_IDS.forEach(cat => { categoryCounts[cat] = 0 })
      
      let existingListStr = ''
      if (existingBots && existingBots.length > 0) {
        existingListStr = '\n[이미 존재하는 봇 목록 - 아래 목록과 절대로 중복되거나 비슷한 컨셉을 만들지 마세요! 완전히 새로운 컨셉을 기획해야 합니다.]\n'
        existingBots.forEach((bot) => {
          if (bot.category && CATEGORY_IDS.includes(bot.category)) {
            categoryCounts[bot.category] = (categoryCounts[bot.category] || 0) + 1
          }
          let coreId = '설명 없음'
          if (bot.advanced_settings) {
            try {
              const settings = typeof bot.advanced_settings === 'string' 
                ? JSON.parse(bot.advanced_settings) 
                : bot.advanced_settings;
              if (settings.coreIdentity) coreId = settings.coreIdentity
            } catch(e) {}
          }
          existingListStr += `- 닉네임: ${bot.display_name}, 정체성: ${coreId}\n`
        })
      } else {
        existingListStr = '\n[현재 존재하는 봇 없음]\n'
      }

      // 9대 분야 로테이션 타겟 카테고리 선정
      const minCount = Math.min(...Object.values(categoryCounts))
      const minCategories = CATEGORY_IDS.filter(cat => categoryCounts[cat] === minCount)
      const targetCategory = minCategories[Math.floor(Math.random() * minCategories.length)]

      // ── 존재유형 균등배정 ──────────────────────────────────────
      const EXISTENCE_TYPES = ['human', 'creature', 'mechanical', 'spiritual', 'extraterrestrial', 'conceptual', 'hybrid', 'other']
      const existenceCounts: Record<string, number> = {}
      EXISTENCE_TYPES.forEach(t => { existenceCounts[t] = 0 })
      if (existingBots) {
        existingBots.forEach((bot: any) => {
          if (bot.existence_category && EXISTENCE_TYPES.includes(bot.existence_category)) {
            existenceCounts[bot.existence_category] = (existenceCounts[bot.existence_category] || 0) + 1
          }
        })
      }
      const minExistenceCount = Math.min(...Object.values(existenceCounts))
      const minExistenceTypes = EXISTENCE_TYPES.filter(t => existenceCounts[t] === minExistenceCount)
      const targetExistenceType = minExistenceTypes[Math.floor(Math.random() * minExistenceTypes.length)]

      // ── 성별 균등배정 ──────────────────────────────────────────
      const GENDER_TYPES = ['male', 'female', 'non_binary', 'unknown']
      const genderCounts: Record<string, number> = {}
      GENDER_TYPES.forEach(g => { genderCounts[g] = 0 })
      if (existingBots) {
        existingBots.forEach((bot: any) => {
          const g = bot.gender || 'unknown'
          if (GENDER_TYPES.includes(g)) {
            genderCounts[g] = (genderCounts[g] || 0) + 1
          }
        })
      }
      const priorityGenders = ['male', 'female', 'non_binary']
      const minGenderCount = Math.min(...priorityGenders.map(g => genderCounts[g]))
      const minGenders = priorityGenders.filter(g => genderCounts[g] === minGenderCount)
      const targetGender = minGenders[Math.floor(Math.random() * minGenders.length)]

      const categoryNames: Record<string, string> = {
        politics: '정치 (Politics)',
        economy: '경제 (Economy)',
        society: '사회 (Society)',
        tech: 'IT/기술 (Tech)',
        world: '세계 (World)',
        entertainment: '연예 (Entertainment)',
        sports: '스포츠 (Sports)',
        culture: '생활/문화 (Culture)',
        opinion: '오피니언 (Opinion)'
      }

      // ── 이름 목록 수집 ──────────────────────────────────
      const existingFirstSyllables = existingBots && existingBots.length > 0
        ? [...new Set(existingBots.map((b: any) => b.display_name.charAt(0)))].join(', ')
        : '없음'

      // ── 조건부 분기: 주제어 유무 ─────────────────────────
      let conceptBlock: string
      if (topic_keyword) {
        conceptBlock = `아래 주제어를 중심으로 캐릭터를 기획하세요: "${topic_keyword}"
이 주제어와 직접 관련된 직업, 관심사, 세계관을 가진 캐릭터를 만드세요.`
      } else {
        conceptBlock = settings?.pro_bot_prompt_1_concept || `당신은 초고도화된 커뮤니티 봇의 입체적인 세계관을 기획하는 작가입니다.\n매우 깊이 있고 디테일한 봇의 배경 스토리, 어린 시절, 트라우마, 현재 직업, 정치 성향 등을 포함한 '핵심 정체성'을 기획해주세요.`
      }

      // ── 존재 스펙트럼 필수 지정 (균등배정 값 주입) ──────────────
      const existenceTypeLabels: Record<string, string> = {
        human: '인간 (Human)',
        creature: '동식물/곤충/생물 (Creature)',
        mechanical: '기계/AI (Mechanical)',
        spiritual: '귀신/영혼 (Spiritual)',
        extraterrestrial: '외계/타차원 존재 (Extraterrestrial)',
        conceptual: '개념/감정의 의인화 (Conceptual)',
        hybrid: '혼합형 (Hybrid)',
        other: '기타 (Other)',
      }
      const genderLabels: Record<string, string> = {
        male: '남성 (male)',
        female: '여성 (female)',
        non_binary: '논바이너리 (non_binary)',
        unknown: '미지정 (unknown)',
      }
      const existenceSpectrumBlock = `[존재 스펙트럼 필수 지정]
이번 봇의 존재유형(existence_category)은 반드시 **"${targetExistenceType}"** (${existenceTypeLabels[targetExistenceType]})으로 지정하세요.
이 유형에 맞는 세계관, 존재 방식, 거주지를 자유롭게 상상하여 캐릭터를 기획하세요.
[성별 필수 지정]
이번 봇의 성별(gender)은 반드시 **"${targetGender}"** (${genderLabels[targetGender]})으로 지정하세요.`

      // ── 이름 생성 규칙 ────────────────────────────────────
      const nameRulesBlock = `[이름 생성 규칙]
- 이름 형식: 핵심 성격/설정을 압축한 2~4음절 단어 + "봇" 접미사가 기본이나, 20% 확률로 접미사 없는 고유명사형 이름도 허용
- 기존 봇 이름 시작 음절: ${existingFirstSyllables} — 이 음절로 시작하지 마세요
- 이름만 보고 대략적인 정체성이 짐작 가능해야 함
- 실존 인물, 실존 브랜드/상표, 타 저작물 캐릭터명과 동일·유사한 이름 절대 금지`

      let prompt = `${conceptBlock}\n\n${existenceSpectrumBlock}\n\n${nameRulesBlock}`
      
      const seed = Math.floor(Math.random() * 1000000);
      prompt += `\n\n[필수 지정 카테고리]\n이 PRO 봇은 반드시 **'${categoryNames[targetCategory]}'** 분야 전문 또는 해당 카테고리와 밀접한 유저 페르소나로 기획되어야 합니다.`
      prompt += `\n\n[중요: 무작위 시드 ${seed} 가 적용되었습니다. 지정된 존재유형과 성별을 반드시 준수하면서 이전 출력과 완전히 다른 무작위 연령, 직업, 성향을 기획하세요.]`
      prompt += `\n${existingListStr}`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "displayName": "닉네임",
  "coreIdentity": "매우 깊이 있는 세계관 및 설정 (3~4줄 이상)",
  "category": "${targetCategory}",
  "existence_category": "${targetExistenceType}",
  "existence_detail": "존재유형 자유 서술 (1~2문장)",
  "realm_category": "earth_physical|earth_metaphysical|celestial|extraterrestrial|dimensional|digital 중 하나 또는 빈 문자열",
  "realm_detail": "거주지 자유 서술 또는 빈 문자열",
  "speech_style": "말투 짧은 서술",
  "gender": "${targetGender}"
}
오직 JSON만 출력하세요. 모든 내용은 반드시 한국어(Korean)로 기획 및 작성해야 합니다.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      const resultJson = JSON.parse(extractJson(jsonStr))
      resultJson.category = targetCategory
      if (topic_keyword) resultJson.topic_keyword = topic_keyword
      return NextResponse.json(resultJson)
    }

    // Step 2: Script
    if (step === 2) {
      if (!coreIdentity) throw new Error('coreIdentity is required for step 2')
      
      let prompt = settings?.pro_bot_prompt_2_script || `당신은 캐릭터 빙의 전문 대본 작가입니다.\n아래 제공된 '핵심 정체성'을 100% 흡수하여, 이 유저가 커뮤니티에 작성할 법한 장문의 가상 게시글 3편을 작성해주세요.\n글에는 이 유저 특유의 억양, 맞춤법 파괴, 은어, 밈이 노골적으로 드러나야 합니다.`
      prompt += `\n\n[핵심 정체성]\n"${coreIdentity}"`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "script": "가상 게시글 3편 전체 내용 (줄바꿈 포함 문자열)"
}
오직 JSON만 출력하세요. 게시글 내용은 반드시 한국어(Korean)로 작성하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    // Step 3: Parameters
    if (step === 3) {
      if (!script) throw new Error('script is required for step 3')
      
      let prompt = settings?.pro_bot_prompt_3_param || `당신은 텍스트 분석 프로파일러입니다.\n아래 제공된 '가상 게시글 3편'을 분석하여, 이 유저의 성격 파라미터(1~10 수치), 입버릇(Catchphrases), 절대 쓰지 않을 단어(Forbidden Words)를 추출해주세요.`
      prompt += `\n\n[가상 게시글 3편 (분석 대상)]\n"${script}"`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "axisTone": 5,
  "axisTarget": 5,
  "axisVocab": 5,
  "axisAttitude": 5,
  "axisAffection": 5,
  "formality": "informal",
  "catchphrases": ["입버릇1", "입버릇2"],
  "forbiddenWords": ["금지어1", "금지어2"],
  "triggerKeywords": ["키워드1", "키워드2"],
  "category": "politics"
}
오직 JSON만 출력하세요. 배열 안의 단어와 문장은 모두 한국어(Korean)로 작성하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    // Step 4: Avatar Prompt
    if (step === 4) {
      if (!coreIdentity) throw new Error('coreIdentity is required for step 4')
      
      let prompt = settings?.pro_bot_prompt_4_avatar || `당신은 이미지 프롬프트 엔지니어입니다.\n아래 제공된 유저의 정체성을 바탕으로, 이 유저의 프로필 사진으로 쓰일 완벽한 아바타를 생성하기 위한 Midjourney/DALL-E 영문 프롬프트를 작성해주세요.`
      prompt += `\n\n[핵심 정체성]\n"${coreIdentity}"`
      prompt += `\n\n[반환해야 할 JSON 형식]
{
  "avatarPrompt": "영어 이미지 생성 프롬프트"
}
오직 JSON만 출력하세요.`

      const jsonStr = await generateEnforcedAIContent(prompt)
      if (!jsonStr) throw new Error('AI 응답을 파싱할 수 없습니다.')
      return NextResponse.json(JSON.parse(extractJson(jsonStr)))
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })

  } catch (error: any) {
    console.error('Pro Bot API Error:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
