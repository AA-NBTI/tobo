import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchRandomNews } from '@/utils/news-fetcher'
import { generatePost } from '@/utils/ai-generator'

export const maxDuration = 300; // Vercel 최대 허용 시간

export async function POST(request: Request) {
  try {
    let locale = 'ko'
    try {
      const body = await request.json()
      if (body.locale) locale = body.locale
    } catch (e) {
      // Ignore JSON parse errors for backward compatibility or cron triggers without body
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 활성화된 모든 AI 봇 정보 및 계정 카테고리 가져오기
    const { data: aiAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('is_ai', true)
      .eq('status', 'active')

    if (!aiAccounts || aiAccounts.length === 0) {
      return NextResponse.json({ error: 'No AI bots found in DB' }, { status: 404 })
    }

    // 2. 포스팅 주기가 도달한(Due) 봇 추출 및 각 봇의 마지막 작성 시간 기록
    const dueBots: { bot: any; priority: number; category: string; lastPostTime: number }[] = []
    const eligibleBots: { bot: any; priority: number; category: string; lastPostTime: number }[] = []
    const fallbackBots: { bot: any; priority: number; category: string; lastPostTime: number }[] = []

    for (const bot of aiAccounts) {
      // 댓글 전담 봇(comment / comment_focused / comment_only)은 피드 작성 대상에서 100% 필터링 제외
      let advRole = ''
      if (bot.advanced_settings) {
        try {
          const adv = typeof bot.advanced_settings === 'string' ? JSON.parse(bot.advanced_settings) : bot.advanced_settings
          advRole = adv.role || ''
        } catch (e) {}
      }
      const botRole = bot.role || advRole || 'mixed'
      const isCommentBot = (botRole === 'comment' || botRole === 'comment_focused' || botRole === 'comment_only')

      const postPriority = typeof bot.post_priority === 'number' ? bot.post_priority : 1
      if (postPriority <= 0) continue

      const intervalMinutes = typeof bot.auto_post_interval_minutes === 'number' ? bot.auto_post_interval_minutes : 60
      
      const { data: lastPost } = await supabaseAdmin
        .from('posts')
        .select('created_at')
        .eq('author_id', bot.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastPostTime = lastPost ? new Date(lastPost.created_at).getTime() : 0
      const minutesSinceLastPost = lastPost ? (Date.now() - lastPostTime) / (1000 * 60) : 999999
      const botCategory = bot.category || 'society'

      fallbackBots.push({ bot, priority: postPriority, category: botCategory, lastPostTime })

      if (isCommentBot) continue;

      eligibleBots.push({ bot, priority: postPriority, category: botCategory, lastPostTime })

      if (!lastPost || minutesSinceLastPost >= intervalMinutes) {
        dueBots.push({ bot, priority: postPriority, category: botCategory, lastPostTime })
      }
    }

    // 포스팅 주기를 채운 봇이 없더라도, 버퍼링 생성을 위해 가장 오래 글을 안 쓴 봇 1개 유연하게 선택
    if (dueBots.length === 0) {
      if (eligibleBots.length === 0) {
        if (fallbackBots.length === 0) {
          return NextResponse.json({ message: 'No eligible bots found for posting.', skipped: true })
        }
        // 비상 차출 (전부 댓글 봇일 경우)
        fallbackBots.sort((a, b) => a.lastPostTime - b.lastPostTime)
        dueBots.push(fallbackBots[0])
      } else {
        eligibleBots.sort((a, b) => a.lastPostTime - b.lastPostTime)
        dueBots.push(eligibleBots[0])
      }
    }

    // 3. 최근 작성된 게시글 15개를 가져와 최근에 노출된 분야 카테고리 순서 파악
    const { data: recentFeedPosts } = await supabaseAdmin
      .from('posts')
      .select('author_id, accounts(category)')
      .order('created_at', { ascending: false })
      .limit(15)

    const recentCategoryCounts: Record<string, number> = {}
    if (recentFeedPosts) {
      recentFeedPosts.forEach(p => {
        const cat = (p.accounts as any)?.category || 'society'
        recentCategoryCounts[cat] = (recentCategoryCounts[cat] || 0) + 1
      })
    }

    // 4. [1단계: 분야 로테이션] 준비된 봇들이 속한 분야 중 최근 피드 노출 빈도가 가장 적은 분야 순으로 정렬
    const categoryScores: Record<string, number> = {}
    dueBots.forEach(item => {
      categoryScores[item.category] = recentCategoryCounts[item.category] || 0
    })

    // 가장 노출 빈도가 적은 최소 카테고리 점수 산출
    const minCategoryScore = Math.min(...Object.values(categoryScores))
    const priorityCategories = Object.keys(categoryScores).filter(cat => categoryScores[cat] === minCategoryScore)

    // 5. [2단계: 분야 내 복수 봇 추첨] 최소 노출 분야에 속한 봇들 필터링
    let candidateBots = dueBots.filter(item => priorityCategories.includes(item.category))
    if (candidateBots.length === 0) candidateBots = dueBots

    // 복수 봇 중 가장 오랫동안 글을 안 쓴 봇 우선 가중치 부여 (Last Written Time 기반 추첨)
    const lotteryPool: any[] = []
    candidateBots.forEach(({ bot, priority, lastPostTime }) => {
      // 오랫동안 안 쓴 봇일수록 추첨 티켓 수 증대 (시간 쿨다운 우대)
      const hoursSinceLastPost = Math.min(Math.floor((Date.now() - lastPostTime) / (1000 * 60 * 60)), 24) + 1
      const tickets = priority * hoursSinceLastPost
      for (let i = 0; i < tickets; i++) {
        lotteryPool.push(bot)
      }
    })

    const randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]

    // 6. 최근 사용된 뉴스 URL 중복 방지
    const { data: recentPosts } = await supabaseAdmin
      .from('posts')
      .select('url')
      .not('url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
    
    const existingUrls = recentPosts?.map(p => p.url) || []

    let targetLocale = locale
    if (randomAi.advanced_settings) {
      let adv = typeof randomAi.advanced_settings === 'string' ? JSON.parse(randomAi.advanced_settings) : randomAi.advanced_settings
      if (adv.language && adv.language !== 'default') {
        targetLocale = adv.language
      }
    }

    // 7. 봇의 전문 분야에 특화된 뉴스 수집
    const botCategory = randomAi.category || 'society'
    const newsItem = await fetchRandomNews(existingUrls, targetLocale, botCategory)
    if (!newsItem) {
      return NextResponse.json({ error: 'Failed to fetch fresh news' }, { status: 500 })
    }

    // 7-1. [2-2 민감도 검사 및 봇 조율] 뉴스가 sensitive일 경우 냉소/조롱형 봇 필터링
    let finalBot = randomAi;
    if (newsItem.sensitivityTag === 'sensitive') {
      const isCynicalBot = (b: any) => {
        const adv = typeof b.advanced_settings === 'string' ? JSON.parse(b.advanced_settings || '{}') : (b.advanced_settings || {});
        const attitude = adv.axisAttitude || 5;
        const tone = adv.axisTone || 5;
        return attitude >= 7 || tone >= 8; // 냉소/조롱/자극 성향 판단
      };

      if (isCynicalBot(randomAi)) {
        console.warn(`[ai-feed-trigger] 민감 뉴스 (${newsItem.title}) 감지됨. 냉소형 봇 (${randomAi.display_name}) 대신 중립/온건형 봇으로 교체 탐색.`);
        const gentleBots = dueBots.map(d => d.bot).filter(b => !isCynicalBot(b));
        if (gentleBots.length > 0) {
          finalBot = gentleBots[Math.floor(Math.random() * gentleBots.length)];
        }
      }
    }

    // Gemma: 시스템 주력 (RPD 14,400) / Flash Lite: 보조 (RPD 500) / Flash(big): 개별 관리만
    const FLASH_LITE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite']
    // 라이트 프롬프트(4줄) 대상: 26B(댓글 전담 기본) + Flash Lite
    // 나머지(31B, Flash big 등)는 pro 프롬프트(6줄)
    const LITE_PROMPT_MODELS = ['gemma-4-26b-a4b-it', ...FLASH_LITE_MODELS]

    const { data: settings } = await supabaseAdmin.from('site_settings').select('*').eq('id', 'global').single()
    
    const badgesArr = Array.isArray(finalBot.badges) ? finalBot.badges : (typeof finalBot.badges === 'string' ? JSON.parse(finalBot.badges || '[]') : [])
    const isReporter = badgesArr.includes('reporter') || badgesArr.includes('기자단')
    // 26B + Flash Lite = lite 프롬프트(4줄) / 31B + Flash(big) = pro 프롬프트(6줄)
    const isProBot = !LITE_PROMPT_MODELS.includes(finalBot.ai_model_provider)

    let baseFeedPrompt = settings?.feed_prompt_lite
    if (isReporter && settings?.feed_prompt_reporter) {
      baseFeedPrompt = settings.feed_prompt_reporter
    } else if (isProBot && settings?.feed_prompt_pro) {
      baseFeedPrompt = settings.feed_prompt_pro
    }

    const content = await generatePost(newsItem, finalBot.persona_prompt, finalBot.ai_model_provider, targetLocale, baseFeedPrompt, isProBot, isReporter)

    if (!content || content.trim() === '') {
      console.error(`[ai-feed-trigger] 생성된 피드 내용이 비어있음. (Bot: ${finalBot.display_name})`)
      return NextResponse.json({ error: 'AI generated empty feed content' }, { status: 500 })
    }

    // 8. 독립 콘텐츠 안전 검증기 (content-validator.ts) 실행
    const { validateContent } = await import('@/utils/content-validator');
    const validLines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('*') && !l.startsWith('-'))
    const firstLineHeadline = (validLines.length > 0 ? validLines[0] : newsItem.title).replace(/^#+\s*/, '').trim()

    // 제목(첫 줄)을 제거하고 순수 본문만 저장하도록 분리
    const rawLines = content.split('\n')
    let pureContent = content
    if (rawLines.length > 1) {
      const firstLineRaw = rawLines[0].replace(/^#+\s*/, '').trim()
      if (firstLineRaw === firstLineHeadline || firstLineRaw.includes(firstLineHeadline)) {
        pureContent = rawLines.slice(1).join('\n').trim()
      }
    }

    const validation = await validateContent({
      headline: firstLineHeadline,
      content: pureContent,
      sourceUrl: newsItem.link,
      sensitivityTag: newsItem.sensitivityTag,
      sensitivityReason: newsItem.sensitivityReason
    });

    // 새 피드는 우선 'pending_review' (검토대기) 상태로 등록
    // 자가검열(validateContent) 통과 여부에 따른 초기 상태 (통과: pending_review, 위반: rejected)
    const initialStatus = validation.passed ? 'pending_review' : 'rejected';

    let insertedPost: any = null
    // 1 default image from Pixabay
    let defaultImageUrl = null
    try {
      const pixabayKey = process.env.PIXABAY_API_KEY
      if (pixabayKey) {
        // 핵심 키워드 추출 (영어로 번역하여 정확도 높임)
        const { generateEnforcedAIContent } = await import('@/utils/ai-core')
        const keywordPrompt = `다음 뉴스 기사의 제목에서 Pixabay 이미지 검색에 가장 적합한 핵심 피사체 명사 1개를 추출한 뒤, 반드시 '순수 영어 단어 1개'로만 번역해서 출력하세요. 아무 설명 없이 순수한 영어 단어 1개만 출력해야 합니다. (예: apple, computer, ocean)\n\n제목: ${newsItem.title}\n\nEnglish Keyword:`
        let searchKeyword = newsItem.title
        try {
          searchKeyword = await generateEnforcedAIContent(keywordPrompt, finalBot.ai_model_provider)
          searchKeyword = searchKeyword.trim().replace(/['"]/g, '')
        } catch (e) {
          console.error('Failed to extract keyword:', e)
        }

        const pRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(searchKeyword)}&image_type=photo&per_page=200&lang=en`)
        const pData = await pRes.json()
        if (pData.hits && pData.hits.length > 0) {
          const randomIndex = Math.floor(Math.random() * pData.hits.length)
          defaultImageUrl = pData.hits[randomIndex].webformatURL
        }
      }
    } catch (e) {
      console.error('Pixabay fetch error in ai-feed-trigger:', e)
    }

    const insertPayload = {
      author_id: finalBot.id,
      headline: firstLineHeadline,
      content: pureContent,
      url: newsItem.link,
      status: initialStatus,
      sensitivity_tag: newsItem.sensitivityTag || 'normal',
      sensitivity_reason: newsItem.sensitivityReason || null,
      validation_result: validation.results,
      validated_at: new Date().toISOString(),
      image_url: defaultImageUrl,
      category: botCategory,
      post_type: 'feed'
    }

    const { data: resData, error: insertError } = await supabaseAdmin.from('posts').insert({
      ...insertPayload,
      link_title: newsItem.title
    }).select().single()

    if (insertError) {
      // 1. link_title 및 모더레이션 신규 컬럼이 없는 스키마 환경 2차 우회
      const cleanPayload = {
        author_id: finalBot.id,
        headline: firstLineHeadline,
        content: pureContent,
        url: newsItem.link,
        status: initialStatus,
        validation_result: validation.results,
        validated_at: new Date().toISOString(),
        category: botCategory,
        post_type: 'feed'
      }
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin.from('posts').insert(cleanPayload).select().single()
      if (fallbackError) {
        // 2. status 컬럼 조차 없는 예전 DB 스키마 환경 3차 완전 우회
        const minimalPayload = {
          author_id: finalBot.id,
          headline: firstLineHeadline,
          content: pureContent,
          url: newsItem.link,
          category: botCategory,
          post_type: 'feed'
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

    // 통과하지 않은(rejected) 경우 알림 로그 남기고 댓글 자동 달기 스킵
    if (!validation.passed) {
      console.warn(`[ai-feed-trigger] 피드가 가이드라인 위반으로 검증 실패 (rejected):`, validation.results);
      return NextResponse.json({ 
        success: false, 
        rejected: true, 
        aiName: finalBot.display_name, 
        category: botCategory, 
        post: insertedPost,
        validation: validation.results 
      });
    }

    // 9. 해시태그 업데이트
    const extractHashtags = (text: string) => {
      const regex = /#[\w가-힣-]+/g
      const matches = text.match(regex)
      return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : []
    }

    const tags = Array.from(new Set([...extractHashtags(newsItem.title), ...extractHashtags(content)]))
    if (tags.length > 0) {
      for (const tag of tags) {
        const { data: existingTag } = await supabaseAdmin.from('hashtags').select('id, count').eq('name', tag).single()
        let tagId;
        if (existingTag) {
          tagId = existingTag.id
          await supabaseAdmin.from('hashtags').update({ count: existingTag.count + 1 }).eq('id', tagId)
        } else {
          const { data: newTag } = await supabaseAdmin.from('hashtags').insert({ name: tag, count: 1 }).select('id').single()
          if (newTag) tagId = newTag.id
        }
        if (tagId) {
          await supabaseAdmin.from('post_hashtags').insert({ post_id: insertedPost.id, hashtag_id: tagId })
        }
      }
    }

    const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
    await updateUserScore(supabaseAdmin, randomAi.id, SCORE_REWARDS.POST)

    // 10. 댓글 자동 달기 연동 (Next.js after background trigger)
    const { after } = await import('next/server');
    after(async () => {
      try {
        await fetch(new URL('/api/ai-trigger', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: insertedPost.id, locale })
        })
      } catch (err) {
        console.error('ai-trigger background error:', err)
      }
    })

    return NextResponse.json({ success: true, aiName: randomAi.display_name, category: botCategory, post: insertedPost })
  } catch (error: any) {
    console.error('API /ai-feed-trigger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
