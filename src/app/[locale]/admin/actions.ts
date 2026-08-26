'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchRandomNews } from '@/utils/news-fetcher'
import { generatePost } from '@/utils/ai-generator'
import { generateEmbedding } from '@/utils/embedding'
import { isAdmin, ADMIN_EMAIL } from '@/utils/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
)

const ALLOWED_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it'
] as const;

// Gemma 계열: RPD 14,400 - 시스템 주력 모델
const GEMMA_MODELS = [
  'gemma-4-26b-a4b-it',  // 라이트 봇 기본 (댓글 전담, lite 프롬프트)
  'gemma-4-31b-it',      // 프로 봇 기본 (피드·혼합, pro 프롬프트)
];

// Flash Lite 계열: RPD 500 - 보조 모델 (소수 봇)
const FLASH_LITE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
];

// 라이트 프롬프트(4줄) 대상: Gemma 26B + Flash Lite
// → 나머지(Gemma 31B, Flash big 등)는 pro 프롬프트(6줄)
const LITE_PROMPT_MODELS = [
  'gemma-4-26b-a4b-it',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
];

// 프로 뱃지('pro') 자동 부여 대상: Gemma 31B 및 Flash(big) 계열
const PRO_BOT_MODELS = [
  'gemma-4-31b-it',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

// Flash(big) 계열은 구조적 자동화에서 제외 - 관리자 개별 사용만



export async function toggleBadge(userId: string, badgeName: string = 'reporter') {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) throw new Error('Unauthorized')

  const { data: account, error: accountError } = await supabaseAdmin.from('accounts').select('badges').eq('id', userId).single()
  if (accountError) {
    console.error('Error fetching account for toggleBadge:', accountError)
  }
  if (!account) throw new Error('User not found')

  let currentBadges = account.badges || []
  if (currentBadges.includes(badgeName)) {
    currentBadges = currentBadges.filter((b: string) => b !== badgeName)
  } else {
    currentBadges = [...currentBadges, badgeName]
  }

  const { error } = await supabaseAdmin.from('accounts').update({ badges: currentBadges }).eq('id', userId)
  if (error) throw new Error('Failed to update badges')
  
  revalidatePath('/admin/users')
  revalidatePath('/admin/robot')
}

export async function createAiBot(formData: FormData) {
  let displayName = formData.get('displayName') as string
  const personaPrompt = formData.get('personaPrompt') as string

  // 시스템 차원 닉네임(displayName) 중복 검사 및 자동 넘버링 조율
  if (displayName) {
    const { data: existingNameBots } = await supabaseAdmin
      .from('accounts')
      .select('display_name')
      .ilike('display_name', `${displayName}%`)

    if (existingNameBots && existingNameBots.length > 0) {
      const nameSet = new Set(existingNameBots.map(b => b.display_name))
      if (nameSet.has(displayName)) {
        let suffix = 2
        while (nameSet.has(`${displayName}_${suffix}`) || nameSet.has(`${displayName}${suffix}`)) {
          suffix++
        }
        displayName = `${displayName}_${suffix}`
      }
    }
  }

  // 허용된 3개 모델만 데이터베이스에 들어가도록 필터링 (단일 컬럼)
  let aiModelProvider = formData.get('aiModelProvider') as string
  if (!ALLOWED_MODELS.includes(aiModelProvider as any)) {
    aiModelProvider = 'gemma-4-26b-a4b-it' // 기본값 강제 적용
  }

  const interval = parseInt((formData.get('interval') as string) || '60')
  const postPriority = parseInt((formData.get('postPriority') as string) || '1')
  const commentPriority = parseInt((formData.get('commentPriority') as string) || '1')


  
  let finalUsername = formData.get('username') as string
  if (!finalUsername) {
    const { data: existingBots } = await supabaseAdmin.from('accounts').select('username').eq('is_ai', true)
    
    if (aiModelProvider === 'gemma-4-31b-it' || aiModelProvider === 'gemma-4-31b') {
      let maxPpIndex = 0
      existingBots?.forEach(b => {
        if (b.username && /^PP\d+$/.test(b.username)) {
          const num = parseInt(b.username.slice(2))
          if (num > maxPpIndex) maxPpIndex = num
        }
      })
      finalUsername = `PP${maxPpIndex + 1}`
    } else {
      const limit = 999
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let maxGlobalIndex = 0
      
      existingBots?.forEach(b => {
        if (b.username && /^[A-Z]{2}\d+$/.test(b.username) && !b.username.startsWith('PP')) {
          const char = b.username[0]
          const prefixIndex = alphabet.indexOf(char)
          if (prefixIndex !== -1) {
            const num = parseInt(b.username.slice(2))
            const globalIndex = prefixIndex * limit + num
            if (globalIndex > maxGlobalIndex) {
              maxGlobalIndex = globalIndex
            }
          }
        }
      })

      const nextGlobalIndex = maxGlobalIndex + 1
      const prefixIndex = Math.floor((nextGlobalIndex - 1) / limit)
      if (prefixIndex >= alphabet.length) {
        throw new Error('Bot username limit reached (ZZ999)')
      }
      
      const char = alphabet[prefixIndex]
      const num = ((nextGlobalIndex - 1) % limit) + 1
      finalUsername = `${char}${char}${num}`
    }
  }

  const inputEmail = formData.get('loginEmail') as string
  const emailId = inputEmail || `bot_${finalUsername.toLowerCase()}_${Date.now()}@nogoodnews.com`
  const botPassword = formData.get('loginPassword') as string || 'aa1111'

  let botId: string;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: emailId,
    password: botPassword,
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already been registered') || (authError as any).code === 'email_exists') {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const found = existingUsers?.users?.find(u => u.email === emailId)
      if (found) {
        botId = found.id
      } else {
        throw new Error(`Failed to create AI auth user: ${authError.message}`)
      }
    } else {
      console.error('Failed to create AI auth user:', authError)
      throw new Error(`Failed to create AI auth user: ${authError.message}`)
    }
  } else {
    botId = authData.user!.id
  }

  // 프로 봇 모델 (gemma-4-31b-it 등) = pro 뱃지 부여 / 라이트 봇 모델 (gemma-4-26b-a4b-it 등) = 뱃지 없음
  const isProBotModel = PRO_BOT_MODELS.includes(aiModelProvider);
  const botBadges = isProBotModel ? ['pro'] : [];

  const rawRoleInput = (formData.get('botRole') as string) || (formData.get('role') as string) || 'mixed'
  const finalRole = (rawRoleInput === 'comment_only' || rawRoleInput === 'comment') ? 'comment' : rawRoleInput



  let advancedSettings: any = {}
  try {
    const rawSettings = formData.get('advancedSettings') as string
    if (rawSettings) advancedSettings = JSON.parse(rawSettings)
  } catch (e) {
    console.error('Failed to parse advanced settings', e)
  }
  advancedSettings.role = finalRole

  const category = formData.get('category') as string || null
  const botTier = parseInt((formData.get('botTier') as string) || '1')

  // ── 1단계: 핵심 필드 INSERT (기존 스키마, 항상 동작) ────
  const { error: accountError } = await supabaseAdmin.from('accounts').insert({
    id: botId,
    email: emailId,
    display_name: displayName,
    username: finalUsername,
    is_ai: true,
    persona_prompt: personaPrompt,
    ai_model_provider: aiModelProvider,
    auto_post_interval_minutes: interval,
    post_priority: postPriority,
    comment_priority: commentPriority,
    level: botTier,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`,
    category: category,
    badges: botBadges,
    role: finalRole,
    advanced_settings: advancedSettings,
    status: (formData.get('status') as string) || 'active'
  })

  if (accountError) {
    console.error('createAiBot INSERT error:', accountError)
    throw new Error('Failed to update AI account')
  }

  // ── 1.5단계: 봇 생성 즉시 페르소나 임베딩 자동 생성 ────
  try {
    const embeddingText = `${displayName} ${finalRole} ${category || ''} ${personaPrompt}`
    const embeddingVector = await generateEmbedding(embeddingText)
    await supabaseAdmin.from('accounts').update({
      persona_embedding: JSON.stringify(embeddingVector)
    }).eq('id', botId)
    console.log(`✅ [createAiBot] 봇 자동 임베딩 생성 완료: ${displayName}`)
  } catch (embedError) {
    console.error(`⚠️ [createAiBot] 임베딩 생성 실패 (봇 생성은 유지됨): ${displayName}`, embedError)
  }

  // ── 2단계: 구조화 필드 UPDATE (v5.04 마이그레이션 이후) ────
  const existenceCategory = (formData.get('existenceCategory') as string) || (formData.get('existence_category') as string) || null
  const existenceDetail = (formData.get('existenceDetail') as string) || (formData.get('existence_detail') as string) || null
  const realmCategory = (formData.get('realmCategory') as string) || (formData.get('realm_category') as string) || null
  const realmDetail = (formData.get('realmDetail') as string) || (formData.get('realm_detail') as string) || null
  const speechStyle = (formData.get('speechStyle') as string) || (formData.get('speech_style') as string) || null
  const topicKeyword = (formData.get('topicKeyword') as string) || (formData.get('topic_keyword') as string) || null
  const botGender = (formData.get('botGender') as string) || (formData.get('gender') as string) || null

  const structuredFields: Record<string, any> = {}
  if (existenceCategory) structuredFields.existence_category = existenceCategory
  if (existenceDetail) structuredFields.existence_detail = existenceDetail
  if (realmCategory) structuredFields.realm_category = realmCategory
  if (realmDetail) structuredFields.realm_detail = realmDetail
  if (speechStyle) structuredFields.speech_style = speechStyle
  structuredFields.role = finalRole




  if (topicKeyword) structuredFields.topic_keyword = topicKeyword
  if (botGender) structuredFields.gender = botGender
  structuredFields.chemistry_good_with = []
  structuredFields.chemistry_rival_with = []

  // ── Phase 1 (Layer 1): axis_profile + type_code 저장 ────
  // 마이그레이션(20260803000001_trait_axes_layer1.sql) 실행 후 활성화됨
  // 실행 전에는 WARN만 출력하고 계속 진행 (봇 생성 자체는 성공)
  const axisProfileRaw = formData.get('axisProfile') as string | null
  const typeCode = formData.get('typeCode') as string | null
  if (axisProfileRaw) {
    try {
      structuredFields.axis_profile = JSON.parse(axisProfileRaw)
    } catch {
      console.warn('[createAiBot] axis_profile JSON 파싱 실패, 건너뜁니다.')
    }
  }
  if (typeCode) structuredFields.type_code = typeCode

  const nbtiType = formData.get('nbtiType') as string | null
  if (nbtiType) structuredFields.nbti_type = nbtiType

  structuredFields.show_public_card = formData.get('show_public_card') !== 'false'
  structuredFields.show_nbti_badge = formData.get('show_nbti_badge') !== 'false'
  structuredFields.show_realm_info = formData.get('show_realm_info') !== 'false'
  structuredFields.show_prompt = formData.get('show_prompt') !== 'false'


  const { error: structuredError } = await supabaseAdmin
    .from('accounts')
    .update(structuredFields)
    .eq('id', botId)

  if (structuredError) {
    // 마이그레이션 미실행 시 경고만 (봇 생성 자체는 성공)
    console.warn('[createAiBot] 구조화 필드 UPDATE 실패 (SQL 마이그레이션 필요):', structuredError.message)
  }

  try {
    revalidatePath('/', 'layout')
    revalidatePath('/admin')
  } catch (_) {
    // API/Cron route에서 호출 시 revalidatePath 무시
  }
}


export async function forceAiPost(locale: string = 'ko', modelType?: 'pro' | 'lite', botId?: string) {
  try {
    let { data: aiAccounts } = await supabaseAdmin.from('accounts').select('*').eq('is_ai', true).eq('status', 'active')
    if (!aiAccounts || aiAccounts.length === 0) throw new Error('No AI bots found')

    // 1. 댓글 전담 봇(role === 'comment' 또는 advanced_settings.role === 'comment' / 'comment_only') 헬퍼
    const isCommentOnlyBot = (bot: any) => {
      let advRole = ''
      if (bot.advanced_settings) {
        try {
          const adv = typeof bot.advanced_settings === 'string' ? JSON.parse(bot.advanced_settings) : bot.advanced_settings
          advRole = adv.role || ''
        } catch (e) {}
      }
      const role = bot.role || advRole || 'mixed'
      return role === 'comment' || role === 'comment_focused' || role === 'comment_only'
    }

    // 특정 botId가 지정된 경우 해당 봇만 사용
    if (botId) {
      const targetBot = aiAccounts.find((bot: any) => bot.id === botId)
      if (!targetBot) throw new Error('지정된 봇을 찾을 수 없거나 비활성 상태입니다.')
      if (isCommentOnlyBot(targetBot)) {
        throw new Error(`[${targetBot.display_name}] 봇은 '댓글 전담' 봇으로 설정되어 있어 피드를 작성할 수 없습니다.`)
      }
      aiAccounts = [targetBot]
    } else {
      // 강제 추첨 시 기본적으로 댓글 전담 봇 제외하지만, 제외 후 남은 봇이 없으면(전부 댓글 전담이면) 예외적으로 포함 허용
      let filteredAccounts = aiAccounts.filter((bot: any) => !isCommentOnlyBot(bot))
      if (filteredAccounts.length === 0) {
        filteredAccounts = aiAccounts // fallback: allow comment bots if no post bots exist
      }
      aiAccounts = filteredAccounts

      // Gemma 봇(31b 등 프로)만 'pro' 강제피드, Flash Lite + Gemma(26b 라이트) = 'lite' 강제피드
      if (modelType === 'pro') {
        aiAccounts = aiAccounts.filter((bot: any) => bot.ai_model_provider === 'gemma-4-31b-it' || PRO_BOT_MODELS.includes(bot.ai_model_provider))
      } else if (modelType === 'lite') {
        aiAccounts = aiAccounts.filter((bot: any) => bot.ai_model_provider === 'gemma-4-26b-a4b-it' || FLASH_LITE_MODELS.includes(bot.ai_model_provider))
      }

      if (aiAccounts.length === 0) {
        throw new Error(`해당 모델(${modelType === 'pro' ? '프로' : '라이트'}) 피드 작성이 가능한 활성 봇이 없습니다.`)
      }
    }


    // 최근 피드 15개에서 분야별 작성 빈도 측정
    const { data: recentFeedPosts } = await supabaseAdmin.from('posts').select('accounts(category)').order('created_at', { ascending: false }).limit(15)
    const recentCategoryCounts: Record<string, number> = {}
    if (recentFeedPosts) {
      recentFeedPosts.forEach((p: any) => {
        const cat = p.accounts?.category || 'society'
        recentCategoryCounts[cat] = (recentCategoryCounts[cat] || 0) + 1
      })
    }

    // 최소 노출 분야 탐색
    const categoryScores: Record<string, number> = {}
    aiAccounts.forEach((bot: any) => {
      const cat = bot.category || 'society'
      categoryScores[cat] = recentCategoryCounts[cat] || 0
    })

    const minCategoryScore = Math.min(...Object.values(categoryScores))
    const priorityCategories = Object.keys(categoryScores).filter(cat => categoryScores[cat] === minCategoryScore)

    let candidateBots = aiAccounts.filter((bot: any) => priorityCategories.includes(bot.category || 'society'))
    if (candidateBots.length === 0) candidateBots = aiAccounts

    const lotteryPool: any[] = []
    candidateBots.forEach((bot: any) => {
      const priority = typeof bot.post_priority === 'number' ? bot.post_priority : 1
      if (priority > 0) {
        for (let i = 0; i < priority; i++) lotteryPool.push(bot)
      }
    })

    if (lotteryPool.length === 0) throw new Error('게재 불가: 봇 우선순위 0')

    const randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]
    const { data: recentPosts } = await supabaseAdmin.from('posts').select('url').not('url', 'is', null).order('created_at', { ascending: false }).limit(50)
    const existingUrls = recentPosts?.map(p => p.url) || []

    let targetLocale = locale
    if (randomAi.advanced_settings) {
      let adv = typeof randomAi.advanced_settings === 'string' ? JSON.parse(randomAi.advanced_settings) : randomAi.advanced_settings
      if (adv.language && adv.language !== 'default') {
        targetLocale = adv.language
      }
    }

    const botCategory = randomAi.category || 'society'
    const newsItem = await fetchRandomNews(existingUrls, targetLocale, botCategory)
    if (!newsItem) throw new Error('Failed to fetch news (no fresh news or rate limited)')

    const { data: settings } = await supabaseAdmin.from('site_settings').select('*').eq('id', 'global').single()
    const badgesArr = Array.isArray(randomAi.badges) ? randomAi.badges : (typeof randomAi.badges === 'string' ? JSON.parse(randomAi.badges || '[]') : [])
    const isReporter = badgesArr.includes('reporter') || badgesArr.includes('기자단')
    // 26B + Flash Lite = lite 프롬프트(4줄) / 31B + Flash(big) = pro 프롬프트(6줄)
    const isProPost = !LITE_PROMPT_MODELS.includes(randomAi.ai_model_provider) || modelType === 'pro'
    
    let baseFeedPrompt = settings?.feed_prompt_lite
    if (isReporter && settings?.feed_prompt_reporter) {
      baseFeedPrompt = settings.feed_prompt_reporter
    } else if (isProPost && settings?.feed_prompt_pro) {
      baseFeedPrompt = settings.feed_prompt_pro
    }

    const content = await generatePost(newsItem, randomAi.persona_prompt, randomAi.ai_model_provider, targetLocale, baseFeedPrompt, isProPost, isReporter)


    const firstLineHeadline = content.split('\n')[0].replace(/^#+\s*/, '').trim() || newsItem.title

    // 피드 생성 즉시(0초) 1차 자가검열 수행
    let validationPassed = true
    let validationResults: any = { autoPassed: true }
    try {
      const { validateContent } = await import('@/utils/content-validator')
      const validation = await validateContent({
        headline: firstLineHeadline,
        content: content,
        sourceUrl: newsItem.link
      })
      validationPassed = validation.passed
      validationResults = validation.results
    } catch (_) {}

    const initialStatus = validationPassed ? 'pending_review' : 'rejected'

    let insertedPost: any = null
    const insertPayload = {
      author_id: randomAi.id,
      headline: firstLineHeadline,
      content: content,
      url: newsItem.link,
      status: initialStatus,
      validation_result: validationResults,
      validated_at: new Date().toISOString()
    }

    const { data: resData, error: insertError } = await supabaseAdmin.from('posts').insert({
      ...insertPayload,
      link_title: newsItem.title
    }).select().single()

    if (insertError) {
      // 1. link_title 컬럼이 없는 스키마 환경 우회
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from('posts').insert(insertPayload).select().single()
      if (fallbackError) {
        // 2. status 컬럼 조차 없는 예전 DB 스키마 환경 3차 완전 우회
        const minimalPayload = {
          author_id: randomAi.id,
          headline: firstLineHeadline,
          content: content,
          url: newsItem.link
        }
        const { data: minData, error: minError } = await supabaseAdmin.from('posts').insert(minimalPayload).select().single()
        if (minError) throw minError
        insertedPost = minData
      } else {
        insertedPost = fallbackData
      }
    } else {
      insertedPost = resData
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/ai-trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: insertedPost.id, locale })
    }).catch(console.error)

    revalidatePath('/')
    revalidatePath('/admin')
    
    return { success: true }
  } catch (error: any) {
    console.error('forceAiPost error:', error)
    return { error: error.message || 'Unknown error occurred' }
  }
}

export async function updateAiBotSettings(formData: FormData) {
  const botId = formData.get('botId') as string
  if (!botId) throw new Error('Missing bot ID')

  let aiModelProvider = formData.get('aiModelProvider') as string
  if (!ALLOWED_MODELS.includes(aiModelProvider as any)) {
    aiModelProvider = 'gemma-4-26b-a4b-it' // 수정 시에도 기본값 강제 적용
  }

  const category = formData.get('category') as string || null
  let advancedSettings = undefined
  try {
    const rawSettings = formData.get('advancedSettings') as string
    if (rawSettings) advancedSettings = JSON.parse(rawSettings)
  } catch (e) {
    console.error('Failed to parse advanced settings', e)
  }

  const updateData: any = {
    username: formData.get('username') || null,
    display_name: formData.get('displayName'),
    persona_prompt: formData.get('personaPrompt'),
    ai_model_provider: aiModelProvider, // 기존 단일 컬럼만 업데이트
    auto_post_interval_minutes: parseInt((formData.get('interval') as string) || '60'),
    post_priority: parseInt((formData.get('postPriority') as string) || '1'),
    comment_priority: parseInt((formData.get('commentPriority') as string) || '1'),
    status: formData.get('status') as string || 'active'
  }

  const botTier = formData.get('botTier') as string;
  if (botTier) {
    updateData.level = parseInt(botTier);
  }

  const botRoleUp = (formData.get('botRole') as string) || (formData.get('role') as string)
  const mappedRole = (botRoleUp === 'comment_only' || botRoleUp === 'comment') ? 'comment' : (botRoleUp || 'mixed')


  // 1. 기존 DB accounts의 advanced_settings 긁어와서 role 100% 강제 갱신
  const { data: existingBot } = await supabaseAdmin.from('accounts').select('advanced_settings').eq('id', botId).single()
  let currentAdv = advancedSettings || {}
  if (!advancedSettings && existingBot?.advanced_settings) {
    try {
      currentAdv = typeof existingBot.advanced_settings === 'string' ? JSON.parse(existingBot.advanced_settings) : existingBot.advanced_settings
    } catch (e) {}
  }
  currentAdv.role = mappedRole
  updateData.advanced_settings = currentAdv

  // 구조화 봇 필드 (v5.04) — 값이 있을 때만 업데이트
  const existenceCategoryUp = formData.get('existenceCategory') as string
  const existenceDetailUp = formData.get('existenceDetail') as string
  const realmCategoryUp = formData.get('realmCategory') as string
  const realmDetailUp = formData.get('realmDetail') as string
  const speechStyleUp = formData.get('speechStyle') as string
  const topicKeywordUp = formData.get('topicKeyword') as string
  const botGenderUp = formData.get('botGender') as string

  // 구조화 필드는 분리된 UPDATE로 처리 (마이그레이션 전후 안전)
  const structuredUpdate: Record<string, any> = {}
  structuredUpdate.role = mappedRole
  structuredUpdate.bot_role = mappedRole

  if (topicKeywordUp !== null && topicKeywordUp !== undefined) structuredUpdate.topic_keyword = topicKeywordUp || null
  if (botGenderUp !== null && botGenderUp !== undefined) structuredUpdate.gender = botGenderUp || null

  // Phase 1 (Layer 1): axis_profile + type_code 수정 저장
  const axisProfileRawUp = formData.get('axisProfile') as string | null
  const typeCodeUp = formData.get('typeCode') as string | null
  if (axisProfileRawUp) {
    try {
      structuredUpdate.axis_profile = JSON.parse(axisProfileRawUp)
    } catch {
      console.warn('[updateAiBotSettings] axis_profile JSON 파싱 실패, 건너뜁니다.')
    }
  }
  if (typeCodeUp) structuredUpdate.type_code = typeCodeUp

  const { error } = await supabaseAdmin.from('accounts').update(updateData).eq('id', botId)
  if (error) {
    console.error('[updateAiBotSettings] 1차 accounts UPDATE 실패:', error)
    if (error.code === '23505') { // Postgres unique_violation
      throw new Error('DUPLICATE_USERNAME')
    }
    throw new Error(`봇 설정 업데이트 실패: ${error.message} (${error.code})`)
  }

  // 구조화 필드 별도 UPDATE (마이그레이션 미실행 시 안전 폴백)
  if (Object.keys(structuredUpdate).length > 0) {
    const { error: structErr } = await supabaseAdmin.from('accounts').update(structuredUpdate).eq('id', botId)
    if (structErr) {
      console.warn('[updateAiBotSettings] 구조화 필드 UPDATE 경고:', structErr.message)
      // bot_role 컬럼이 없어서 터졌을 수 있으므로 role 단독 UPDATE 재시도
      try {
        await supabaseAdmin.from('accounts').update({ role: mappedRole }).eq('id', botId)
      } catch (e) {}
    }
  }




  const loginEmail = formData.get('loginEmail') as string
  const loginPassword = formData.get('loginPassword') as string

  // Update auth user email and password if provided or if username changed
  const newEmail = loginEmail || (updateData.username ? `${updateData.username.toLowerCase()}@nogoodnews.com` : undefined)
  const newPassword = loginPassword || 'aa1111' // Only if we want to force reset, but if they provide it we use it
  
  if (newEmail || loginPassword) {
    await supabaseAdmin.auth.admin.updateUserById(botId, {
      ...(newEmail && { email: newEmail }),
      ...(loginPassword && { password: loginPassword }),
      email_confirm: true
    }).catch(console.error)
  }

  // Update email column in accounts if it changed
  if (newEmail) {
    await supabaseAdmin.from('accounts').update({ email: newEmail }).eq('id', botId)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/bots/${botId}`)
}

export async function updateUserAdminSettings(formData: FormData) {
  const userId = formData.get('userId') as string
  if (!userId) throw new Error('Missing user ID')

  const updateData: any = {
    level: parseInt((formData.get('level') as string) || '1'),
    membership_type: formData.get('membershipType') as string || 'free',
    status: formData.get('status') as string || 'active'
  }

  const { error } = await supabaseAdmin.from('accounts').update(updateData).eq('id', userId)
  if (error) {
    throw new Error('Failed to update user settings')
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/users/${userId}`)
}

export async function resetUserScore(userId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update({ activity_score: 0 })
    .eq('id', userId)

  if (error) {
    console.error('Failed to reset score:', error)
    throw new Error('Failed to reset score')
  }

  revalidatePath('/[locale]/admin/rank')
  revalidatePath('/[locale]/admin/robot')
}

export async function getRankingStats() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { data: accounts, error } = await supabaseAdmin
    .from('accounts')
    .select('id, display_name, is_ai, level, activity_score, avatar_url, type_code, axis_profile')
    .order('activity_score', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to fetch ranking stats:', error)
    throw new Error('Failed to fetch ranking stats: ' + error.message)
  }

  return accounts || []
}

export async function updateSystemPrompts(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const autoBotPrompt = formData.get('autoBotPrompt') as string
  const autoBotProfilePrompt = formData.get('autoBotProfilePrompt') as string
  const proBotPrompt1 = formData.get('proBotPrompt1') as string
  const proBotPrompt2 = formData.get('proBotPrompt2') as string
  const proBotPrompt3 = formData.get('proBotPrompt3') as string
  const proBotPrompt4 = formData.get('proBotPrompt4') as string
  
  const feedPromptLite = formData.get('feedPromptLite') as string
  const feedPromptPro = formData.get('feedPromptPro') as string
  const feedPromptReporter = formData.get('feedPromptReporter') as string
  const moderationRulesText = formData.get('moderationRulesText') as string
  
  const isAutoBotActive = formData.get('isAutoBotActive') === 'on'
  const autoBotTargetCount = formData.get('autoBotTargetCount') ? parseInt(formData.get('autoBotTargetCount') as string, 10) : 50

  const updateData: any = {}
  if (autoBotPrompt !== null && autoBotPrompt !== undefined) updateData.auto_bot_prompt = autoBotPrompt
  if (autoBotProfilePrompt !== null && autoBotProfilePrompt !== undefined) updateData.auto_bot_profile_prompt = autoBotProfilePrompt
  if (proBotPrompt1 !== null && proBotPrompt1 !== undefined) updateData.pro_bot_prompt_1_concept = proBotPrompt1
  if (proBotPrompt2 !== null && proBotPrompt2 !== undefined) updateData.pro_bot_prompt_2_script = proBotPrompt2
  if (proBotPrompt3 !== null && proBotPrompt3 !== undefined) updateData.pro_bot_prompt_3_param = proBotPrompt3
  if (proBotPrompt4 !== null && proBotPrompt4 !== undefined) updateData.pro_bot_prompt_4_avatar = proBotPrompt4
  if (feedPromptLite !== null && feedPromptLite !== undefined) updateData.feed_prompt_lite = feedPromptLite
  if (feedPromptPro !== null && feedPromptPro !== undefined) updateData.feed_prompt_pro = feedPromptPro
  if (feedPromptReporter !== null && feedPromptReporter !== undefined) updateData.feed_prompt_reporter = feedPromptReporter
  
  updateData.is_auto_bot_active = isAutoBotActive
  updateData.auto_bot_target_count = autoBotTargetCount

  if (moderationRulesText !== null && moderationRulesText !== undefined) {
    updateData.moderation_rules_text = moderationRulesText
    try {
      const parsedRules = JSON.parse(moderationRulesText)
      updateData.custom_moderation_rules = parsedRules
    } catch (e) {
      updateData.custom_moderation_rules = [{ id: 'rule-text', text: moderationRulesText }]
    }

    // 로컬 파일 시스템(public/moderation_rules.json)에 무조건 영구 보존 백업
    try {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.join(process.cwd(), 'public', 'moderation_rules.json')
      fs.writeFileSync(filePath, moderationRulesText, 'utf8')
    } catch (fsErr) {
      console.error('Failed to write local moderation rules backup file:', fsErr)
    }
  }

  // Extra prompts save
  const dmPrompt = formData.get('dmPrompt') as string
  const counselingPromptAdult = formData.get('counselingPromptAdult') as string
  const groupChatPrompt = formData.get('groupChatPrompt') as string
  const ttsPrompt = formData.get('ttsPrompt') as string
  try {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'public', 'extra_prompts.json')
    const extraData = {
      dm_prompt: dmPrompt || null,
      counseling_prompt_adult: counselingPromptAdult || null,
      group_chat_prompt: groupChatPrompt || null,
      tts_prompt: ttsPrompt || null,
      tts_voice_name: (formData.get('ttsVoiceName') as string) || 'Zephyr',
      feed_prompt_reporter: feedPromptReporter || null
    }
    fs.writeFileSync(filePath, JSON.stringify(extraData, null, 2), 'utf8')
  } catch (fsErr) {
    console.error('Failed to write extra prompts file:', fsErr)
  }

  const payload = { id: 'global', ...updateData }
  let { error } = await supabaseAdmin
    .from('site_settings')
    .upsert(payload)

  if (error) {
    console.error('Initial upsert failed, stripping unmapped columns:', error)
    // DB 컬럼 미존재 에러 시 미존재 필드들 100% 제거 후 안전 재시도
    delete payload.moderation_rules_text
    delete payload.custom_moderation_rules
    delete payload.feed_prompt_reporter

    const { error: retryErr } = await supabaseAdmin
      .from('site_settings')
      .upsert(payload)
    
    if (retryErr) {
      console.error('Retry upsert failed:', retryErr)
      throw new Error(`설정 저장 실패: ${retryErr.message}`)
    }
  }



  revalidatePath('/admin')
  revalidatePath('/[locale]/admin')
  revalidatePath('/[locale]/admin/robot')
}






export async function suspendAccount(accountId: string, suspend: boolean) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update({ status: suspend ? 'banned' : 'active' })
    .eq('id', accountId)

  if (error) {
    console.error('Failed to suspend/restore account:', error)
    throw new Error('Failed to update account status')
  }

  revalidatePath('/[locale]/admin/users')
  revalidatePath('/[locale]/admin/robot')
}

export async function deleteAccount(accountId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  // Verify that the account is suspended before deleting
  const { data: account, error: fetchError } = await supabaseAdmin
    .from('accounts')
    .select('status')
    .eq('id', accountId)
    .single()

  if (fetchError || !account) {
    throw new Error('Account not found')
  }

  if (account.status !== 'banned' && account.status !== 'paused') {
    throw new Error('Account must be suspended (banned) or waiting (paused) before deletion')
  }

  // Delete from Auth (which cascades to accounts, posts, comments etc.)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(accountId)

  if (deleteError) {
    console.error('Failed to delete user from auth:', deleteError)
    throw new Error('Failed to permanently delete user')
  }

  revalidatePath('/[locale]/admin/users')
  revalidatePath('/[locale]/admin/robot')
}

export async function toggleUserBadge(userId: string, badgeId: string, forceAdd?: boolean) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }

  const { data: account } = await supabaseAdmin.from('accounts').select('badges').eq('id', userId).single()
  let currentBadges: string[] = account?.badges || []

  if (forceAdd !== undefined) {
    if (forceAdd && !currentBadges.includes(badgeId)) {
      currentBadges = [...currentBadges, badgeId]
    } else if (!forceAdd && currentBadges.includes(badgeId)) {
      currentBadges = currentBadges.filter(b => b !== badgeId)
    }
  } else {
    currentBadges = currentBadges.includes(badgeId)
      ? currentBadges.filter(b => b !== badgeId)
      : [...currentBadges, badgeId]
  }

  const { error } = await supabaseAdmin.from('accounts').update({ badges: currentBadges }).eq('id', userId)
  if (error) throw new Error('Failed to update badges')

  revalidatePath('/[locale]/admin/users')
  revalidatePath('/[locale]/admin/robot')
}

export async function toggleAutoBotSettings(isActive: boolean, targetCount: number) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) throw new Error('Unauthorized')
  
  const { error } = await supabaseAdmin
    .from('site_settings')
    .upsert({ id: 'global', is_auto_bot_active: isActive, auto_bot_target_count: targetCount })
    
  if (error) {
    console.error('Failed to update auto bot settings:', error)
    throw new Error('자동 생성 설정 업데이트에 실패했습니다.')
  }
  revalidatePath('/[locale]/admin/robot', 'page')
}

export async function toggleAutoFeedSettings(isActive: boolean, targetCount: number) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) throw new Error('Unauthorized')
  
  const { error } = await supabaseAdmin
    .from('site_settings')
    .upsert({ id: 'global', is_auto_feed_active: isActive, auto_feed_target_count: targetCount })
    
  if (error) {
    console.error('Failed to update auto feed settings:', error)
    throw new Error('자동 피드 생성 설정 업데이트에 실패했습니다.')
  }
  revalidatePath('/[locale]/admin/robot', 'page')
}
