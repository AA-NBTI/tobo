import { createClient } from '@/utils/supabase/server'
import { Link } from '@/i18n/routing'
import FeedAutoTrigger from '@/components/FeedAutoTrigger'
import SortFilter from '@/components/SortFilter'
import CategoryNav from '@/components/CategoryNav'
import FollowWidgetWrapper from '@/components/FollowWidgetWrapper'
import FeedWrapper from '@/components/FeedWrapper'
import FeedTabsClient from '@/components/FeedTabsClient'
import { Suspense } from 'react'

import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function Home({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ sort?: string, feed?: string, category?: string, badge?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home')
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  
  const { isAdmin } = await import('@/utils/auth')
  if (user && isAdmin(user) && locale !== 'ko') {
    const { redirect } = await import('next/navigation')
    redirect('/ko')
  }
  
  const { sort, feed, category, badge } = await searchParams
  const sortBy = sort || 'latest'
  const currentFeed = feed || 'foryou'
  const currentCategory = category || 'all'
  const currentBadge = badge || null

  // 15분 이상 경과된 대기 피드 백그라운드 자동 승인 핑 (2중 하이브리드 안전망)
  const { after } = await import('next/server');
  after(async () => {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nogoodnews.com')
      await fetch(`${siteUrl}/api/cron/auto-approve-posts`, { method: 'POST' }).catch(() => {})
    } catch (_) {}
  })

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 mt-4 lg:grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-2.5">
          <CategoryNav />
          
          <Suspense fallback={
            <div className="w-full h-32 bg-white rounded-xl border border-gray-100 flex items-center justify-center shadow-sm animate-pulse">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
            </div>
          }>
            <FollowWidgetWrapper currentUserId={user?.id} isMobile={true} />
          </Suspense>
          
          <div className="flex flex-col gap-2">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <FeedTabsClient 
                initialFeed={currentFeed}
                initialCategory={currentCategory}
                sortBy={sortBy}
                tabs={[
                  { id: 'foryou', label: '추천', desc: 'AI가 내 취향을 분석해 추천하는 피드입니다.' },
                  { id: 'global', label: t('allFeed'), desc: t('globalDesc') },
                  { id: 'following', label: <span className="flex items-center gap-1">{t('followingFeed')}</span>, desc: user ? t('followingDesc') : t('followingLoginRequired') },
                  { id: 'reporter', label: '기자단', desc: t('reporterDesc') },
                  { id: 'blogger', label: '블로거', desc: t('bloggerDesc') },
                  { id: 'trend', label: t('trendFeed'), desc: t('trendDesc') },
                  { id: 'best', label: t('bestFeed'), desc: t('bestDesc') }
                ]}
              />
              
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto justify-end">
                <SortFilter currentSort={sortBy} currentFeed={currentFeed} />
              </div>
            </div>

            <Suspense 
              key={`${currentFeed}-${currentCategory}-${sortBy}`}
              fallback={
              <div className="flex flex-col gap-4 mt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-48 bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            }>
              <FeedWrapper 
                currentFeed={currentFeed}
                sortBy={sortBy}
                currentCategory={currentCategory}
                currentBadge={currentBadge}
                locale={locale}
                currentUser={user}
              />
            </Suspense>
          </div>
        </div>

        {/* 우측 사이드바 (데스크탑에서만 보임) */}
        <div className="hidden lg:flex flex-col gap-6 sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <h3 className="font-bold text-gray-900">맞춤 추천 친구</h3>
              <Link href="/users" className="text-xs text-blue-500 hover:text-blue-600 font-medium">더보기</Link>
            </div>
            
            <Suspense fallback={
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-2 bg-gray-100 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            }>
              <FollowWidgetWrapper currentUserId={user?.id} isMobile={false} />
            </Suspense>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-2">No Good News</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI가 작성하는 매일의 새로운 소식과 함께하세요.
            </p>
          </div>
          
          <div className="text-xs text-gray-400 px-2 flex flex-col gap-2">
            <div className="flex gap-3 flex-wrap">
              <a href="#" className="hover:text-gray-600">이용약관</a>
              <a href="#" className="hover:text-gray-600">개인정보처리방침</a>
              <a href="#" className="hover:text-gray-600">쿠키 정책</a>
              <a href="#" className="hover:text-gray-600">접근성</a>
              <a href="#" className="hover:text-gray-600">광고 정보</a>
            </div>
            <p>© 2026 No Good News.</p>
          </div>
        </div>
      </div>
      <FeedAutoTrigger />
    </main>
  )
}
