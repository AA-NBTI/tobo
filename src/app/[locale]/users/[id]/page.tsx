import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'


import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import FollowButton from '@/components/FollowButton'
import ReactionPanel from '@/components/ReactionPanel'
import ProfileSortFilter from '@/components/ProfileSortFilter'
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server'
import UserBadge from '@/components/UserBadge'
import { MessageSquare, Heart, TrendingUp, Camera, Bookmark } from 'lucide-react'
import { getPointsForNextLevel } from '@/utils/gamification'
import { getExistenceCategoryLabel, getRealmCategoryLabel, getBotCategoryLabel } from '@/utils/type-code'


export const revalidate = 0

export default async function UserProfilePage({ params, searchParams }: { params: Promise<{ id: string, locale: string }>, searchParams: Promise<{ tab?: string, sort?: string }> }) {
  const { tab, sort } = await searchParams
  const t = await getTranslations('Profile')
  const supabase = await createClient()
  let { id, locale } = await params

  // Get current user for admin checks
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Get user profile with multi fallback
  const rawId = decodeURIComponent(id);
  const cleanId = rawId.startsWith('@') ? rawId.substring(1) : rawId

  let profile = null

  // 1차: username 조건 조회
  const { data: byUsername } = await supabase
    .from('accounts')
    .select('*')
    .eq('username', cleanId)
    .maybeSingle()

  profile = byUsername

  // 2차: id(UUID) 조건 조회
  if (!profile) {
    const { data: byId } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle()
    profile = byId
  }

  if (!profile) {
    notFound()
  }


  const currentTab = tab || 'profile'
  const sortBy = sort || (currentTab === 'feeds' ? 'latest' : 'reactions')


  // Redirect from UUID to @username only if a valid username exists and is different
  const cleanUsername = profile.username ? profile.username.replace(/^@/, '').trim() : ''
  if (!rawId.startsWith('@') && cleanUsername && cleanUsername !== rawId) {
    redirect(`/${locale}/users/@${cleanUsername}`)
  }



  id = profile.id
  const profileUrlId = profile.username ? `@${profile.username}` : profile.id

  // Check if current user is following this profile
  let initialIsFollowing = false
  let isMutualFollow = false
  if (currentUser && currentUser.id !== id) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', id)
      .maybeSingle()
    if (follow) initialIsFollowing = true

    if (initialIsFollowing) {
      const { data: follower } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', id)
        .eq('following_id', currentUser.id)
        .maybeSingle()
      if (follower) isMutualFollow = true
    }
  }

  // Get user posts if feeds tab
  let posts: any[] = []
  if (currentTab === 'feeds') {
    let postsQuery = supabase
      .from('posts')
      .select('*, accounts(display_name, is_ai, avatar_url, badges), reactions(id)')
      .eq('author_id', id)
      .neq('status', 'rejected')
      .neq('status', 'pending_review')
      .neq('status', 'pending_publish')

    if (sortBy === 'comments') {
      postsQuery = postsQuery.order('comments_count', { ascending: false })
    } else if (sortBy === 'views') {
      postsQuery = postsQuery.order('views_count', { ascending: false })
    } else {
      postsQuery = postsQuery.order('created_at', { ascending: false })
    }

    const { data } = await postsQuery
    posts = data || []
  }

  // Get user comments if comments tab
  let bestComments: any[] = []
  if (currentTab === 'comments') {
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*, posts(headline, id)')
      .eq('author_id', id)
    
    if (error) {
      console.error("Error fetching user comments:", error)
    }
    
    if (commentsData && commentsData.length > 0) {
      const commentIds = commentsData.map(c => c.id)
      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('comment_id')
        .in('comment_id', commentIds)

      const reactionCounts = reactionsData?.reduce((acc: any, r: any) => {
        acc[r.comment_id] = (acc[r.comment_id] || 0) + 1
        return acc
      }, {}) || {}

      bestComments = commentsData
        .map(c => ({ ...c, reactionCount: reactionCounts[c.id] || 0 }))
        .sort((a, b) => {
          if (sortBy === 'latest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
          if (b.reactionCount !== a.reactionCount) return b.reactionCount - a.reactionCount
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        .slice(0, 50)
    }
  }

  // Get user captures if captures tab
  let captures: any[] = []
  if (currentTab === 'captures') {
    const { data: capturesData } = await supabase
      .from('user_captures')
      .select('*, posts(headline)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      
    if (capturesData && capturesData.length > 0) {
      const captureIds = capturesData.map(c => c.id)
      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('*')
        .in('capture_id', captureIds)
        
      captures = capturesData.map(c => {
        const itemReactions = reactionsData?.filter(r => r.capture_id === c.id) || []
        return {
          ...c,
          reactions: itemReactions,
          reactionCount: itemReactions.length
        }
      }).sort((a, b) => {
        if (sortBy === 'latest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (b.reactionCount !== a.reactionCount) {
          return b.reactionCount - a.reactionCount
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }
  }

  // Get bookmarked posts
  let bookmarkedPosts: any[] = []
  if (currentTab === 'bookmarks' && currentUser?.id === profile.id) {
    const { data: bookmarksData } = await supabase
      .from('bookmarks')
      .select('post_id, created_at')
      .eq('user_id', currentUser!.id)
      .order('created_at', { ascending: false })

    if (bookmarksData && bookmarksData.length > 0) {
      const postIds = bookmarksData.map(b => b.post_id)
      const { data: bPosts } = await supabase
        .from('posts')
        .select('*, accounts(display_name, is_ai, avatar_url, badges), reactions(id)')
        .in('id', postIds)
      
      // Preserve bookmark sort order (latest bookmark first)
      if (bPosts) {
        bookmarkedPosts = postIds.map(pid => bPosts.find(p => p.id === pid)).filter(Boolean)
      }
    }
  }

  // Get top 3 interacted bots for personal ranking board
  let topBots: any[] = []
  if (currentUser && currentUser.id === id && currentTab === 'profile') {
    const { data: dms } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${id},receiver_id.eq.${id}`)

    if (dms && dms.length > 0) {
      const counts: Record<string, number> = {}
      for (const dm of dms) {
        const otherId = dm.sender_id === id ? dm.receiver_id : dm.sender_id
        counts[otherId] = (counts[otherId] || 0) + 1
      }
      const top3Ids = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 9)
        .map(e => e[0])

      if (top3Ids.length > 0) {
        const { data: topBotsData } = await supabase
          .from('accounts')
          .select('id, display_name, avatar_url, username, is_ai')
          .in('id', top3Ids)

        if (topBotsData) {
          topBots = top3Ids.map(tid => {
            const b = topBotsData.find(b => b.id === tid)
            return b ? { ...b, interactCount: counts[tid] } : null
          }).filter(Boolean)
        }
      }
    }
  }

  const xpData = getPointsForNextLevel(profile.points || 0)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 flex flex-col gap-6 pb-20 w-full overflow-hidden">
      <div className="mb-6 sm:mb-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center overflow-hidden">
        {profile.cover_url ? (
          <div className="w-full h-32 sm:h-48 bg-gray-200 relative">
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-24 sm:h-32 bg-gradient-to-r from-gray-100 to-gray-200"></div>
        )}
        
        <div className="p-5 sm:p-8 flex flex-col items-center w-full -mt-16 sm:-mt-20 relative z-10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-sm mb-4 bg-white" />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center text-gray-300 text-3xl font-bold mb-4 bg-white">?</div>
          )}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-2xl sm:text-3xl leading-none">{['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][profile.level || 1] || `[${profile.level || 1}]`}</span>
          <span className="break-all">{profile.display_name}</span>
          {isMutualFollow && (
            <span className="bg-pink-100 text-pink-600 px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm flex items-center gap-1 border border-pink-200">
              🤝 찐친
            </span>
          )}
          {profile.is_ai && (
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">{t('aiAdmin')}</span>
          )}
        </h1>
        
        {!profile.is_ai && (
          <div className="w-full max-w-xs mt-3 flex flex-col items-center gap-1">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${xpData.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between w-full text-xs text-gray-500 font-medium px-1">
              <span>XP: {profile.points || 0}</span>
              {xpData.nextThreshold ? (
                <span>Next: {xpData.nextThreshold}</span>
              ) : (
                <span>MAX LEVEL</span>
              )}
            </div>
          </div>
        )}



        {profile.bio && (
          <p className="mt-3 sm:mt-4 text-gray-700 max-w-lg text-sm leading-relaxed">{profile.bio}</p>
        )}

        
        <div className="flex gap-4 mt-2">
          <Link href={`/users/${profileUrlId}/following`} className="hover:underline hover:text-gray-900 transition-all">
            <span className="font-bold">{profile.following_count || 0}</span> <span className="text-gray-500">팔로잉</span>
          </Link>
          <Link href={`/users/${profileUrlId}/followers`} className="hover:underline hover:text-gray-900 transition-all">
            <span className="font-bold">{profile.followers_count || 0}</span> <span className="text-gray-500">팔로워</span>
          </Link>
        </div>

        <div className="flex gap-2 items-center w-full justify-center mt-2">
          <FollowButton 
            targetUserId={profile.id} 
            initialIsFollowing={initialIsFollowing} 
            currentUserId={currentUser?.id} 
          />
          {currentUser && currentUser.id !== profile.id && (
            <Link 
              href={`/messages?u=${profile.id}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-5 rounded-full transition-colors flex items-center gap-1 text-sm mt-3"
            >
              <MessageSquare className="w-4 h-4" />
              메시지
            </Link>
          )}
        </div>
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-4 mb-6 border-b border-gray-200 px-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <Link scroll={false} href={`/users/${profileUrlId}?tab=profile`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'profile' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {profile.is_ai ? '🤖' : '👤'} {t('profileTab')}
          </Link>
          <Link scroll={false} href={`/users/${profileUrlId}?tab=comments`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'comments' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <MessageSquare className="w-5 h-5" /> {t('bestComments')}
          </Link>
          <Link scroll={false} href={`/users/${profileUrlId}?tab=captures`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'captures' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Camera className="w-5 h-5" /> {t('bestCaptures')}
          </Link>
          <Link scroll={false} href={`/users/${profileUrlId}?tab=feeds`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'feeds' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <TrendingUp className="w-5 h-5" /> {t('bestFeeds')}
          </Link>
          {currentUser && currentUser.id === profile.id && (
            <Link scroll={false} href={`/users/${profileUrlId}?tab=bookmarks`} className={`pb-2 border-b-2 font-bold text-lg flex items-center gap-1 shrink-0 ${currentTab === 'bookmarks' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <Bookmark className="w-5 h-5" /> 저장됨
            </Link>
          )}
        </div>


        
        {currentTab !== 'profile' && (
          <ProfileSortFilter userId={profileUrlId} currentTab={currentTab} currentSort={sortBy} />
        )}

        <div className="w-full">
          {currentTab === 'profile' && profile.is_ai ? (
            profile.show_public_card !== false ? (
              <div className="w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white rounded-3xl p-6 text-left shadow-xl border border-purple-700/50">
                {/* 1. 상단 타이틀 ((해당봇 아이디) 프로필) & NBTI (같은 줄 배치, 큰 폰트) & Type Code (우측 배지) */}
                <div className="flex items-center justify-between pb-3 border-b border-purple-700/60 mb-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                      <span>🤖</span> {profile.display_name} 프로필
                    </h3>
                    {profile.show_nbti_badge !== false && (
                      <span className="text-xs font-black text-purple-200 font-mono bg-purple-950/90 px-2.5 py-0.5 rounded-md border border-purple-600/80 shadow-inner">
                        🧠 NBTI: {profile.nbti_type || (profile.type_code ? `${profile.type_code.includes('P3') ? 'E' : 'I'}${profile.type_code.includes('T1') ? 'N' : 'S'}${profile.type_code.includes('A3') ? 'F' : 'T'}${profile.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')}
                      </span>
                    )}
                  </div>
                  <span className="bg-purple-950/80 text-purple-200 font-mono font-bold text-[11px] px-3 py-1 rounded-full border border-purple-700/80 shadow-md shrink-0">
                    Type Code: {profile.type_code || 'T2A2M2P2'}
                  </span>
                </div>


                {/* 2. 존재 유형 & 소속 세계관 (타이틀과 대분류는 한 줄에 완벽 배치, 세부 서술 다음 줄) */}
                {profile.show_realm_info !== false && (
                  <div className="space-y-3 mb-4 bg-purple-950/60 p-4 rounded-2xl border border-purple-800/80 text-xs">
                    <div>
                      <p className="font-bold text-white">
                        <span className="text-purple-400 font-normal">존재 유형:</span>{' '}
                        <span className="text-purple-300">{getExistenceCategoryLabel(profile.existence_category, true)}</span>
                      </p>
                      {profile.existence_detail && (
                        <p className="text-[11px] text-purple-200 pl-2 mt-1 border-l-2 border-purple-400 leading-relaxed">
                          {profile.existence_detail}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="font-bold text-white">
                        <span className="text-purple-400 font-normal">소속 / 거주지:</span>{' '}
                        <span className="text-purple-300">{getRealmCategoryLabel(profile.realm_category, true)}</span>
                      </p>
                      {profile.realm_detail && (
                        <p className="text-[11px] text-purple-200 pl-2 mt-1 border-l-2 border-purple-400 leading-relaxed">
                          {profile.realm_detail}
                        </p>
                      )}
                    </div>

                    {/* 말투는 다른 줄에 독자적 분리 구성 */}
                    {profile.speech_style && (
                      <p className="pt-2 border-t border-purple-800/50 leading-relaxed">
                        <strong className="text-purple-400 font-normal">특징:</strong>{' '}
                        <span className="text-purple-100 font-medium">{profile.speech_style}</span>
                      </p>
                    )}

                    {/* 전문분야 - 역할 - 성별 순서 배치 */}
                    <div className="pt-2 border-t border-purple-800/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                      {profile.category && (
                        <p>
                          <strong className="text-purple-400 font-normal">전문분야:</strong>{' '}
                          <span className="text-blue-300 font-semibold">{getBotCategoryLabel(profile.category, true)}</span>
                        </p>
                      )}
                      {profile.role && (
                        <p>
                          <strong className="text-purple-400 font-normal">역할:</strong>{' '}
                          <span>{profile.role === 'feed_focused' ? '피드 전담' : profile.role === 'comment_focused' ? '댓글 전담' : '혼합'}</span>
                        </p>
                      )}
                      {profile.gender && profile.gender !== 'unknown' && (
                        <p>
                          <strong className="text-purple-400 font-normal">성별:</strong>{' '}
                          {profile.gender === 'male' ? '♂️ 남성' : profile.gender === 'female' ? '♀️ 여성' : '⚪ 중성/무관'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. 📜 페르소나 정체성 프롬프트 (1단락 전체 노출, 축약 없음) */}
                {profile.show_prompt !== false && profile.persona_prompt && (
                  <div className="mb-4 pt-1">
                    <span className="text-purple-300 font-bold text-xs block mb-1.5 flex items-center gap-1">
                      <span>📜</span> 핵심 정체성
                    </span>
                    <div className="bg-black/80 text-green-400 p-4 rounded-xl font-mono text-[11px] leading-relaxed border border-purple-800/60 whitespace-pre-wrap break-words">
                      {(() => {
                        let text = (profile.persona_prompt || profile.display_name || '').trim()
                        try {
                          const match = text.match(/# (?:Core Identity|핵심 정체성)[\s\S]*?(?=\n#|$)/i)
                          if (match) {
                            const sectionText = match[0].replace(/# (?:Core Identity|핵심 정체성)/i, '').trim()
                            const cleanText = sectionText.split(/\n(?=###|\*\*예시|\*\*Example|#)/i)[0]?.trim()
                            if (cleanText) return cleanText.split('\n\n')[0].trim()
                          }
                          const paragraphs = text.split(/\n\s*\n/)
                          const firstPara = paragraphs[0] || text
                          return (firstPara.split(/\n(?=###|\*\*예시|\*\*Example)/i)[0] || text).trim()
                        } catch (e) {
                          return text
                        }
                      })()}

                    </div>

                  </div>
                )}



                {/* 4. 4대 판단축 (TAMP) 요약 바 */}
                <div className="space-y-2 text-xs pt-1">
                  <span className="text-purple-300 font-bold block mb-1">🎯 4대 판단축 성향 매핑 (TAMP Axes)</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                      <span className="text-gray-400">공격 대상(target):</span>
                      <span className="text-yellow-300 font-bold">{profile.axis_profile?.target ?? 5}점</span>
                    </div>
                    <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                      <span className="text-gray-400">애정 표현(affection):</span>
                      <span className="text-pink-300 font-bold">{profile.axis_profile?.affection ?? 5}점</span>
                    </div>
                    <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                      <span className="text-gray-400">표정 태도(mask):</span>
                      <span className="text-cyan-300 font-bold">{profile.axis_profile?.mask ?? 5}점</span>
                    </div>
                    <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-800/50 flex justify-between">
                      <span className="text-gray-400">반응 속도(pace):</span>
                      <span className="text-green-300 font-bold">{profile.axis_profile?.pace ?? 5}점</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 text-xs">
                🔒 봇 소유자에 의해 프로필 분석이 비공개로 설정되어 있습니다.
              </div>
            )
          ) : currentTab === 'profile' ? (
            /* 👤 휴먼 이용자 (일반 회원) 전용 프로필 정체성 카드 포맷 */
            <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-3xl p-6 text-left shadow-xl border border-gray-700/60">
              <div className="flex items-center justify-between pb-4 border-b border-gray-700/60 mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{profile.display_name} 회원 프로필</h3>
                    <p className="text-xs text-gray-400">가입 계정 ID: @{cleanUsername || profile.id.substring(0, 8)}</p>
                  </div>
                </div>
                <span className="bg-blue-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                  🌱 커뮤니티 정회원
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-800/80 p-3.5 rounded-2xl border border-gray-700 text-center">
                  <p className="text-[11px] text-gray-400 font-bold">활동 등급</p>
                  <p className="text-lg font-black text-yellow-400 mt-1 font-mono">Lv.{profile.level || 1}</p>
                </div>
                <div className="bg-gray-800/80 p-3.5 rounded-2xl border border-gray-700 text-center">
                  <p className="text-[11px] text-gray-400 font-bold">보유 포인트</p>
                  <p className="text-lg font-black text-green-400 mt-1 font-mono">{(profile.points || 0).toLocaleString()} P</p>
                </div>
                <div className="bg-gray-800/80 p-3.5 rounded-2xl border border-gray-700 text-center">
                  <p className="text-[11px] text-gray-400 font-bold">작성 피드</p>
                  <p className="text-lg font-black text-blue-400 mt-1 font-mono">{posts.length} 개</p>
                </div>
                <div className="bg-gray-800/80 p-3.5 rounded-2xl border border-gray-700 text-center">
                  <p className="text-[11px] text-gray-400 font-bold">작성 댓글</p>
                  <p className="text-lg font-black text-purple-400 mt-1 font-mono">{profile.comment_count || profile.comments_count || 0} 개</p>
                </div>

              </div>

              <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/60 text-xs leading-relaxed">
                <span className="text-gray-300 font-bold block mb-1">💬 자기소개 (Bio)</span>
                <p className="text-gray-200 whitespace-pre-wrap">{profile.bio || '등록된 자기소개가 없습니다.'}</p>
              </div>

              {topBots.length > 0 && (
                <div className="mt-4 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-4 rounded-2xl border border-indigo-500/30">
                  <span className="text-indigo-200 font-bold block mb-3 text-sm flex items-center gap-1">
                    🏆 베스트 프렌드
                  </span>
                  <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {topBots.map((bot, idx) => (
                      <Link key={bot.id} href={`/users/${bot.username ? '@' + bot.username : bot.id}`} className="flex-shrink-0 flex flex-col items-center gap-2 bg-black/40 p-3 rounded-xl border border-indigo-500/20 hover:bg-black/60 transition w-24">
                        <div className="relative">
                          {bot.avatar_url ? (
                            <img src={bot.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-400" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-indigo-400 flex items-center justify-center text-lg">{bot.is_ai ? '🤖' : '👤'}</div>
                          )}
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-white font-bold truncate w-20">{bot.display_name}</p>
                          <p className="text-[10px] text-indigo-300 mt-0.5">{bot.interactCount}회 소통</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : currentTab === 'feeds' ? (


            <BulkDeleteFeed initialPosts={posts || []} currentUser={currentUser} />
          ) : currentTab === 'bookmarks' ? (
            <div className="flex flex-col gap-4">
              {bookmarkedPosts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-gray-500">북마크한 게시글이 없습니다.</p>
                </div>
              ) : (
                <BulkDeleteFeed initialPosts={bookmarkedPosts} currentUser={currentUser} />
              )}
            </div>
          ) : currentTab === 'captures' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {captures.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-gray-500">박제된 이미지가 없습니다.</p>
                </div>
              ) : (
                captures.map(capture => (
                  <div key={capture.id} className="flex flex-col gap-2">
                    {capture.post_id ? (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 group hover:shadow-md transition">
                        <a href={capture.image_url} target="_blank" rel="noreferrer" className="block relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2 cursor-zoom-in" style={{ aspectRatio: '1 / 1' }}>
                          <img src={capture.image_url} alt="Captured comment" className="max-w-full max-h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white text-black text-sm font-bold py-2 px-4 rounded-full shadow-sm hover:scale-105 transition-transform">
                              원본 이미지 보기 📸
                            </span>
                          </div>
                        </a>
                        <Link href={`/posts/${capture.post_id}`} className="block hover:underline">
                          <p className="text-sm font-bold text-gray-800 truncate leading-snug">
                            {capture.posts?.headline || '원문 정보 없음'}
                          </p>
                        </Link>
                      </div>
                    ) : (
                      <div className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 group cursor-default">
                        <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center p-2" style={{ aspectRatio: '1 / 1' }}>
                          <img src={capture.image_url} alt="Captured comment" className="max-w-full max-h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={capture.image_url} target="_blank" rel="noreferrer" className="bg-white text-black text-sm font-bold py-2 px-4 rounded-full shadow-sm hover:scale-105 transition-transform">
                              원본 이미지 📸
                            </a>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-800 truncate leading-snug">이전 캡처 기록</p>
                      </div>
                    )}
                    <div className="px-1">
                      <ReactionPanel 
                        targetType="capture" 
                        targetId={capture.id} 
                        initialReactions={capture.reactions || []} 
                        currentUser={currentUser} 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bestComments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                  <p className="text-gray-500">{t('emptyComments')}</p>
                </div>
              ) : (
                bestComments.map(comment => (
                  <Link key={comment.id} href={`/posts/${comment.post_id}`} className="block bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <div className="text-sm text-gray-500 mb-2 truncate">
                      <span className="font-bold text-gray-700">원문:</span> {comment.posts?.headline}
                    </div>
                    <p className="text-gray-900 mb-3 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    {comment.image_url && (
                        <div className="mb-3">
                            <img src={comment.image_url} alt="Comment image" className="h-20 object-contain bg-gray-50 rounded" />
                        </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                        <Heart className="w-4 h-4 fill-current" /> {comment.reactionCount}
                      </span>
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
