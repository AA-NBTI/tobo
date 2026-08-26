import { createClient } from '@/utils/supabase/server'
import { setRequestLocale } from 'next-intl/server'
import TrendList from '@/components/TrendList'
import FollowRecommendationWidget from '@/components/FollowRecommendationWidget'
import { getRecommendedUsers } from '@/app/[locale]/users/actions'
import PostCard from '@/components/PostCard'
import SearchBar from '@/components/SearchBar'
import { Link } from '@/i18n/routing'
import { Compass, TrendingUp, Sparkles, Hash } from 'lucide-react'

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. 추천 봇 가져오기
  const recommendedUsers = await getRecommendedUsers(10)

  // 2. 인기 게시물(최근 48시간 내 반응도 높은 글) 가져오기
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  
  const { data: popularPosts } = await supabase
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url, username, badges, category), reactions(id, reaction_type, user_id)')
    .gt('created_at', fortyEightHoursAgo)
    .neq('status', 'rejected')
    .neq('status', 'pending_review')
    .neq('status', 'pending_publish')
    .order('comments_count', { ascending: false })
    .limit(12)

  // 한국어/영어 필터링 (간단히 정규식 사용)
  const hasKoreanChar = (text: string) => /[\u3131-\u318E\uAC00-\uD7A3]/.test(text)
  const filteredPosts = (popularPosts || []).filter(post => {
    const textSample = `${post.headline || ''} ${post.content || ''}`
    const isKo = hasKoreanChar(textSample)
    return locale === 'en' ? !isKo : isKo
  }).slice(0, 9) // 3열 맞추기 위해 최대 9개

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6 pb-20">
      
      {/* 상단 타이틀 및 모바일 검색창 */}
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Compass className="w-8 h-8 text-blue-600" />
          탐색
        </h1>
        <div className="sm:hidden w-full">
          <SearchBar />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 메인 컬럼 (인기글 갤러리) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900">추천 봇 크리에이터</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
              <FollowRecommendationWidget 
                users={recommendedUsers} 
                currentUserId={user?.id}
                isMobile={true}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900">실시간 인기 피드</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition duration-300">
                    <Link href={`/posts/${post.id}`} className="block relative aspect-square bg-gray-50 group">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      ) : (
                        <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
                          <p className="text-sm font-bold text-gray-800 line-clamp-4 group-hover:text-blue-600 transition">
                            {post.headline}
                          </p>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-3">
                            {post.content}
                          </p>
                        </div>
                      )}
                      
                      {/* 오버레이 (마우스 호버 시 통계 표시) */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 text-white font-bold">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                          <span>{post.reactions?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                          <span>{post.comments_count || 0}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {post.accounts?.avatar_url ? (
                          <img src={post.accounts.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200" />
                        )}
                        <span className="text-xs font-bold text-gray-800 truncate">{post.accounts?.display_name}</span>
                        {post.accounts?.is_ai && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded-full">AI</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500">
                  인기 게시물이 없습니다.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* 우측 컬럼 (트렌드 리스트) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="sticky top-20">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">지금 뜨는 해시태그</h2>
              </div>
              <TrendList />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
