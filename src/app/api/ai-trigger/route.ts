import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

export const maxDuration = 300; // Vercel 서버리스 타임아웃 300초로 연장

// 지목 기능: 이름/닉네임 조각 포함 여부 및 유사도 판별 (하이픈/공백 분리 매칭 지원)
function isNameTargeted(comment: string, name: string): boolean {
  const c = comment.toLowerCase();
  const n = name.toLowerCase().trim();

  // 1. 전체 이름이 포함된 경우 바로 true
  if (c.includes(n)) return true;

  // 2. 하이픈('-'), 슬래시('/'), 괄호, 공백 등으로 닉네임 분리 (예: "회로노마드-CircuitNomad" -> ["회로노마드", "circuitnomad"])
  const parts = n.split(/[-/_/()\s]+/).map(p => p.trim()).filter(p => p.length >= 2);
  for (const part of parts) {
    if (c.includes(part)) return true;
  }

  // 3. 분리된 각 이름 조각 기준으로 유사도 검사
  for (const part of parts) {
    const commonChars = [...part].filter(char => c.includes(char)).length;
    if ((commonChars / part.length) >= 0.7) return true;
  }

  return false;
}

const processingPosts = new Set<string>();

export async function POST(request: Request) {
  let requestPostId: string | null = null;
  try {
    const body = await request.json()
    const { postId, locale = 'ko' } = body
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    requestPostId = postId;

    if (processingPosts.has(postId)) {
      return NextResponse.json({ message: 'Already processing' });
    }
    processingPosts.add(postId);

    // ── after(): 응답 전송 후 백그라운드에서 댓글 생성 ─────────────────────
    // 5초 대기 제거 → Gemma 생성 자체가 자연스러운 텀을 만들어줌
    after(async () => {
      try {
        console.log(`🚀 [ai-trigger/after] 백그라운드 댓글 생성 시작 (Post: ${postId})`);

        // DB 쓰기 전파 대기 (사용자 닉네임 댓글이 DB에 반영될 시간 확보)
        // UI는 이미 즉시 응답했으므로 사용자 경험에 영향 없음
        await new Promise(r => setTimeout(r, 1000))

        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: post } = await supabaseAdmin.from('posts').select('*').eq('id', postId).single()
        if (!post) { console.error('[after] Post not found:', postId); return; }
        if (post.status !== 'published') { 
          console.log(`[after] Post ${postId} is not published (status: ${post.status}). Skipping AI comment.`); 
          return; 
        }

        const { data: comments } = await supabaseAdmin
          .from('comments')
          .select('*, accounts(display_name, is_ai)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })

        let botDepth = 0;
        if (comments && comments.length > 0) {
          for (let i = comments.length - 1; i >= 0; i--) {
            if (comments[i].accounts?.is_ai) botDepth++;
            else break;
          }
          
          if (botDepth > 0) {
             if (botDepth >= 3) {
               console.log('[after] 봇 티키타카 Depth 제한 도달 (3회 이상) → 생성 스킵');
               return;
             }
             // Depth 1 (bot answering bot 1st time): 50% chance
             // Depth 2 (bot answering bot 2nd time): 20% chance
             const decayChance = botDepth === 1 ? 0.5 : 0.2;
             if (Math.random() > decayChance) {
               console.log(`[after] 봇 티키타카 확률 제한 탈락 (Depth: ${botDepth}) → 생성 스킵`);
               return;
             }
          }
        }

        const { data: aiAccounts } = await supabaseAdmin
          .from('accounts')
          .select('*')
          .eq('is_ai', true)
          .eq('status', 'active')
        if (!aiAccounts || aiAccounts.length === 0) {
          console.error('[after] No AI bots found'); return;
        }

        let triggerUserId = post.author_id;
        let latestComment = '';

        if (comments && comments.length > 0) {
          triggerUserId = comments[comments.length - 1].author_id;
          latestComment = comments[comments.length - 1].content;
        }

        const { data: userData } = await supabaseAdmin
          .from('accounts').select('level').eq('id', triggerUserId).single();
        const userLevel = userData?.level || 1;

        const { data: followsData } = await supabaseAdmin
          .from('follows').select('following_id').eq('follower_id', triggerUserId);
        const followedBotIds = new Set(followsData?.map(f => f.following_id) || []);

        const allowedBots = aiAccounts.filter(bot => {
          const botTier = bot.level || 1;
          return botTier <= userLevel || followedBotIds.has(bot.id);
        });

        if (allowedBots.length === 0) {
          console.log('[after] 이 유저 티어에서 허용된 봇 없음'); return;
        }

        // ── triggerType 판별 ──────────────────────────────────────────────
        let triggerType: 'summon' | 'chaining' | 'cold_start' | undefined = undefined
        let summonedBy: string | undefined
        let summonMessage: string | undefined
        let chainingBot: string | undefined
        let chainingMessage: string | undefined

        if (!comments || comments.length === 0) {
          triggerType = 'cold_start'
        } else {
          const lastComment = comments[comments.length - 1]
          if (lastComment.accounts?.is_ai) {
            triggerType = 'chaining'
            chainingBot = lastComment.accounts?.display_name || '봇'
            chainingMessage = lastComment.content
          }
        }

        // ── role 필터: post(피드전용) 봇은 댓글 대상에서 완전 제외 ─────────
        const commentEligibleBots = allowedBots.filter((bot: any) => {
          const adv = typeof bot.advanced_settings === 'string'
            ? JSON.parse(bot.advanced_settings)
            : (bot.advanced_settings || {})
          const role = bot.role || bot.bot_role || adv.role || 'mixed'
          return role !== 'post' // 피드전용(post) role은 댓글 불가
        })
        if (commentEligibleBots.length === 0) {
          console.log('[after] 댓글 가능한 봇 없음 (모두 피드전용)'); return;
        }
        const poolForSelection = commentEligibleBots

        let randomAi = null;

        if (latestComment) {
          const targetedBot = poolForSelection.find((bot: any) => {
            const mentioned = latestComment.includes(`@${bot.username}`);
            const named = isNameTargeted(latestComment, bot.display_name);
            return mentioned || named;
          });

          if (targetedBot) {
            randomAi = targetedBot;
            triggerType = 'summon'
            summonedBy = comments && comments.length > 0
              ? (comments[comments.length - 1].accounts?.display_name || '익명')
              : '익명'
            summonMessage = latestComment
          }
        }

        if (!randomAi) {
          // ── 시맨틱 매칭: 최신 댓글/뉴스 헤드라인과 가장 잘 어울리는 봇 선택 ──
          // 임베딩이 있는 봇이 1개 이상 있으면 코사인 유사도로 선택
          const botsWithEmbedding = poolForSelection.filter((bot: any) => bot.persona_embedding)

          if (botsWithEmbedding.length > 0 && latestComment) {
            try {
              const { generateEmbedding, findMostSimilarBot } = await import('@/utils/embedding')
              // 최신 댓글 + 뉴스 헤드라인을 합쳐서 맥락 임베딩 생성
              const contextText = `${post.headline}\n${latestComment}`
              const contextEmbedding = await generateEmbedding(contextText)
              const match = findMostSimilarBot(botsWithEmbedding, contextEmbedding)
              if (match) {
                console.log(`[after] 시맨틱 매칭 봇 선택: ${match.bot.display_name} (유사도: ${match.similarity.toFixed(3)})`)
                randomAi = match.bot
              }
            } catch (embErr) {
              console.warn('[after] 시맨틱 매칭 실패, priority 추첨으로 fallback:', embErr)
            }
          }

          // fallback: 임베딩 없거나 매칭 실패 시 기존 priority 추첨
          if (!randomAi) {
            const lotteryPool: any[] = []
            poolForSelection.forEach((bot: any) => {
              const priority = typeof bot.comment_priority === 'number' ? bot.comment_priority : 1
              for (let i = 0; i < priority; i++) lotteryPool.push(bot)
            })
            if (lotteryPool.length === 0) { console.log('[after] 추첨 풀이 비어있음'); return; }
            randomAi = lotteryPool[Math.floor(Math.random() * lotteryPool.length)]
            console.log(`[after] priority 추첨 봇 선택: ${randomAi.display_name}`)
          }
        }


        let recentCommentsContext = ''
        if (comments && comments.length > 0) {
          recentCommentsContext = comments.slice(-5)
            .map((c: any) => `${c.accounts?.display_name || '익명'}: ${c.content}`)
            .join('\n')
        }

        let targetLocale = locale
        if (randomAi.advanced_settings) {
          const adv = typeof randomAi.advanced_settings === 'string'
            ? JSON.parse(randomAi.advanced_settings)
            : randomAi.advanced_settings
          if (adv.language && adv.language !== 'default') {
            targetLocale = adv.language
          }
        }

        const { generateComment } = await import('@/utils/ai-generator')
        const aiText = await generateComment(
          post.headline,
          post.content,
          randomAi.persona_prompt,
          randomAi.ai_model_provider,
          recentCommentsContext,
          targetLocale,
          triggerType,
          summonedBy,
          summonMessage,
          chainingBot,
          chainingMessage,
        )

        // 인간적인 타이핑/생각 시간 지연 (체이닝일 경우 2~4초 추가 대기)
        if (triggerType === 'chaining') {
          const readingDelay = Math.floor(Math.random() * 2000) + 2000;
          await new Promise(r => setTimeout(r, readingDelay));
        }

        await supabaseAdmin.from('comments').insert({
          post_id: postId,
          author_id: randomAi.id,
          content: aiText
        })

        await supabaseAdmin.rpc('increment_views', { post_id: postId })

        // Phase 4: 활동 기반 선팔 (봇이 첫 코멘트를 달 때, 50% 확률로 게시글 작성자를 선팔)
        if (triggerType === 'cold_start' && Math.random() < 0.5 && post.author_id) {
          const { data: authorAcc } = await supabaseAdmin.from('accounts').select('gender').eq('id', post.author_id).single()
          const bg = randomAi.gender
          const ug = authorAcc?.gender
          const isValid = bg !== 'neutral' && ((bg === 'male' && ug === 'female') || (bg === 'female' && ug === 'male'))
          
          if (isValid) {
            await supabaseAdmin.from('follows').insert({
              follower_id: randomAi.id,
              following_id: post.author_id
            }).select() // ignore errors like duplicates
          }
        }

        const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
        await updateUserScore(supabaseAdmin, randomAi.id, SCORE_REWARDS.FIRST_COMMENT)

        revalidatePath(`/${locale}/posts/${postId}`);
        revalidatePath(`/posts/${postId}`);
        revalidatePath('/', 'layout');

        console.log(`✅ [after] 댓글 생성 완료: ${randomAi.display_name} (Post: ${postId})`);
      } catch (err) {
        console.error('[after] 백그라운드 댓글 생성 실패:', err)
      } finally {
        processingPosts.delete(postId);
      }
    })

    // 즉시 응답 반환 → UI 비차단
    console.log(`🚀 [ai-trigger] 즉시 응답 반환, 백그라운드 생성 시작 (Post: ${postId})`);
    return NextResponse.json({ success: true, message: 'Comment generation started in background' })

  } catch (error: any) {
    console.error('API /ai-trigger error:', error)
    if (requestPostId) processingPosts.delete(requestPostId);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}