'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import PostCard from '@/components/PostCard'
import { deleteMultiplePosts, getFeedPosts } from '@/app/feed-actions'
import { isAdmin } from '@/utils/auth'
import { Link, useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function BulkDeleteFeed({ 
  initialPosts, 
  currentUser, 
  sortFilter,
  headerLeftContent,
  headerBottomContent,
  feedTopContent,
  emptyFeedState,
  externalDeleteMode,
  hideInternalDeleteButton,
  feedType = 'foryou',
  sortBy = 'latest',
  currentCategory = 'all',
  currentBadge = null,
  locale = 'ko'
}: { 
  initialPosts: any[], 
  currentUser: any, 
  sortFilter?: React.ReactNode,
  headerLeftContent?: React.ReactNode,
  headerBottomContent?: React.ReactNode,
  feedTopContent?: React.ReactNode,
  emptyFeedState?: React.ReactNode,
  externalDeleteMode?: boolean,
  hideInternalDeleteButton?: boolean,
  feedType?: string,
  sortBy?: string,
  currentCategory?: string,
  currentBadge?: string | null,
  locale?: string
}) {
  const t = useTranslations('Home')
  const [localPosts, setLocalPosts] = useState<any[]>(initialPosts || [])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState((initialPosts || []).length === 20)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [internalDeleteMode, setInternalDeleteMode] = useState(false)
  const router = useRouter()
  
  React.useEffect(() => {
    setLocalPosts(initialPosts || [])
    setPage(1)
    setHasMore((initialPosts || []).length === 20)
  }, [initialPosts])

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const newPosts = await getFeedPosts({
        page: nextPage,
        limit: 20,
        feed: feedType,
        sort: sortBy,
        category: currentCategory,
        badge: currentBadge,
        locale
      })
      
      if (newPosts && newPosts.length > 0) {
        setLocalPosts(prev => {
          // 중복 제거 (혹시 모를 새 글 밀림 방지)
          const existingIds = new Set(prev.map((p: any) => p.id))
          const filteredNew = newPosts.filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...filteredNew]
        })
        setPage(nextPage)
        setHasMore(newPosts.length === 20)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error(err)
      toast.error('추가 데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const deleteMode = externalDeleteMode !== undefined ? externalDeleteMode : internalDeleteMode;
  const hasAdmin = isAdmin(currentUser)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === localPosts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(localPosts.map(p => p.id))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개의 게시물과 달린 댓글들을 모두 삭제하시겠습니까?`)) return

    setIsDeleting(true)
    try {
      await deleteMultiplePosts(selectedIds)
      toast.success(`${selectedIds.length}개의 게시물이 일괄 삭제되었습니다.`)
      setSelectedIds([])
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('삭제 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleDeleteMode = () => {
    setInternalDeleteMode(prev => !prev)
    setSelectedIds([])
  }

  // Effect to clear selection when external delete mode turns off
  React.useEffect(() => {
    if (externalDeleteMode === false) {
      setSelectedIds([])
    }
  }, [externalDeleteMode])

  if (!localPosts || localPosts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {(!hideInternalDeleteButton || sortFilter || headerLeftContent) && (
          <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="w-full sm:w-auto">
              <div className="flex gap-4 mb-2 border-b border-gray-200">
                {headerLeftContent}
              </div>
              {headerBottomContent && (
                <div className="min-h-[1.25rem] flex items-center">
                  {headerBottomContent}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasAdmin && !hideInternalDeleteButton && (
                <button
                  onClick={handleToggleDeleteMode}
                  className={`text-xs font-semibold px-2 py-1 rounded-md border transition whitespace-nowrap ${
                    deleteMode
                      ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {deleteMode ? '삭제 취소' : '삭제'}
                </button>
              )}
              {sortFilter && (
                <div>
                  {sortFilter}
                </div>
              )}
            </div>
          </div>
        )}
        
        {feedTopContent && (
          <div>
            {feedTopContent}
          </div>
        )}
        
        {emptyFeedState ? (
          emptyFeedState
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">{t('emptyFeed')}</p>
            {currentUser && (
              <Link href="/posts/new" className="text-blue-500 hover:underline font-semibold">
                {t('writeFirstPost')}
              </Link>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {(!hideInternalDeleteButton || sortFilter || headerLeftContent) && (
        <div className="mb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex gap-4 mb-2 border-b border-gray-200">
              {headerLeftContent}
            </div>
            {headerBottomContent && (
              <div className="min-h-[1.25rem] flex items-center">
                {headerBottomContent}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto justify-end">
            {hasAdmin && !hideInternalDeleteButton && (
              <button
                onClick={handleToggleDeleteMode}
                className={`text-xs font-semibold px-2 py-1 rounded-md border transition whitespace-nowrap ${
                  deleteMode
                    ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {deleteMode ? '삭제 취소' : '삭제'}
              </button>
            )}
            {sortFilter && (
              <div>
                {sortFilter}
              </div>
            )}
          </div>
        </div>
      )}
      
      {feedTopContent && (
        <div>
          {feedTopContent}
        </div>
      )}

      {hasAdmin && deleteMode && (
        <div className="sticky top-4 z-50 flex items-center justify-between bg-white p-4 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={selectedIds.length === localPosts.length && localPosts.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 cursor-pointer accent-black"
            />
            <span className="font-semibold text-gray-700 text-sm">
              {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨` : '전체 선택'}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className={`bg-red-500 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              선택 일괄 삭제
            </button>
          )}
        </div>
      )}

      {localPosts.map((post) => (
        <div key={post.id} className="relative flex items-stretch gap-3">
          {hasAdmin && deleteMode && (
            <div className="pt-5 pl-2 flex items-start">
              <input 
                type="checkbox" 
                checked={selectedIds.includes(post.id)}
                onChange={() => toggleSelect(post.id)}
                className="w-5 h-5 cursor-pointer accent-black"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <PostCard post={post} currentUser={currentUser} hideDeleteButton={hasAdmin} />
          </div>
        </div>
      ))}
      
      {hasMore && (
        <div className="py-6 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
              isLoadingMore 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg active:scale-95'
            }`}
          >
            {isLoadingMore ? '불러오는 중...' : '더 보기'}
          </button>
        </div>
      )}
      
      {!hasMore && localPosts.length > 0 && (
        <div className="py-8 text-center text-gray-400 text-sm">
          마지막 게시물입니다.
        </div>
      )}
    </div>
  )
}
