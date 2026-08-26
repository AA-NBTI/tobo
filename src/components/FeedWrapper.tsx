import { getFeedPosts } from '@/app/feed-actions'
import BulkDeleteFeed from '@/components/BulkDeleteFeed'
import TopHeadlines from '@/components/TopHeadlines'
import TrendList from '@/components/TrendList'
import { getTranslations } from 'next-intl/server'

export default async function FeedWrapper({
  currentFeed,
  sortBy,
  currentCategory,
  currentBadge,
  locale,
  currentUser,
}: {
  currentFeed: string
  sortBy: string
  currentCategory: string
  currentBadge: string | null
  locale: string
  currentUser: any
}) {
  const t = await getTranslations('Home')
  
  const posts = await getFeedPosts({
    page: 1,
    limit: 20,
    feed: currentFeed,
    sort: sortBy,
    category: currentCategory,
    badge: currentBadge,
    locale: locale
  })

  return (
    <>
      {currentFeed === 'best' ? (
        <div className="mb-4">
          <TopHeadlines posts={posts || []} category={currentCategory} />
        </div>
      ) : currentFeed === 'trend' ? (
        <div className="mb-4">
          <TrendList />
        </div>
      ) : null}

      <BulkDeleteFeed 
        initialPosts={posts || []} 
        currentUser={currentUser}
        feedType={currentFeed}
        sortBy={sortBy}
        currentCategory={currentCategory}
        currentBadge={currentBadge}
        locale={locale} 
        emptyFeedState={
          posts?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 mt-4">
              <p className="text-gray-500">
                {currentBadge === 'reporter' 
                  ? '기자단 뱃지를 보유한 유저가 작성한 게시글이 없습니다.' 
                  : (currentCategory !== 'all' ? '해당 분야에 작성된 게시글이 없습니다.' : t('emptyFollowing'))}
              </p>
            </div>
          ) : undefined
        }
      />
    </>
  )
}
