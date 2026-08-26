'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from '@/i18n/routing'
import { approvePost, bulkApprovePosts, deletePostPermanently, runAutoApproveCronNow } from '@/app/[locale]/admin/guidelines-actions'
import PostCard from '@/components/PostCard'

export default function ReviewQueueClientUI({ posts: initialPosts, initialTab = 'pending_review' }: { posts: any[], initialTab?: string }) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [isRunningCron, setIsRunningCron] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [page, setPage] = useState(1)

  // 서버에서 prop으로 전달된 posts가 변경될 때마다(router.refresh) 로컬 상태 동기화
  useEffect(() => {
    setPosts(initialPosts)
  }, [initialPosts])

  // initialTab이 변경되면 activeTab 동기화
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // 1분마다 타이머 갱신 및 서버 데이터 재조회(자동 새로고침)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
      router.refresh()
    }, 60000)
    return () => clearInterval(timer)
  }, [router])

  const handleRunCronNow = async () => {
    setIsRunningCron(true)
    const toastId = toast.loading('⚡ 15분 경과 대기 피드 크론 일괄 승인 진행 중...')
    try {
      const res = await runAutoApproveCronNow()
      if (res.count && res.count > 0) {
        setPosts(posts.map(p => {
          if (p.status === 'pending_review') {
            return { ...p, status: 'published' }
          }
          return p
        }))
        toast.success(res.message, { id: toastId })
      } else {
        toast.success(res.message || '15분 이상 경과된 대기 피드가 없습니다.', { id: toastId })
      }
    } catch (e: any) {
      toast.error(e.message || '크론 실행 실패', { id: toastId })
    } finally {
      setIsRunningCron(false)
    }
  }

  const handleApprove = async (postId: string) => {
    try {
      await approvePost(postId)
      setPosts(posts.map(p => p.id === postId ? { ...p, status: 'published' } : p))
      toast.success('게시물이 성공적으로 수동 발행 승인되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '승인 실패')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개 항목을 예약 발행하시겠습니까?`)) return
    
    setIsProcessing(true)
    const toastId = toast.loading(`항목 ${selectedIds.length}개 예약 발행 중...`)
    
    try {
      await bulkApprovePosts(selectedIds)
      
      // 상태 낙관적 업데이트 (ui에서는 published로 간주)
      setPosts(posts.map(p => selectedIds.includes(p.id) ? { ...p, status: 'published' } : p))
      setSelectedIds([])
      toast.success('선택 항목이 예약 발행 대기열에 등록되었습니다.', { id: toastId })
    } catch (e: any) {
      toast.error(e.message || '일괄 승인 실패', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveSingle = async (id: string) => {
    setIsProcessing(true)
    const toastId = toast.loading('예약 발행 처리 중...')
    try {
      await approvePost(id)
      setPosts(posts.map(p => p.id === id ? { ...p, status: 'published' } : p))
      toast.success('포스트가 예약 발행 대기열에 등록되었습니다.', { id: toastId })
    } catch (e: any) {
      toast.error(e.message || '처리 실패', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개 항목을 영구 삭제하시겠습니까?`)) return

    setIsProcessing(true)
    const toastId = toast.loading(`항목 ${selectedIds.length}개 삭제 중...`)

    try {
      for (const id of selectedIds) {
        await deletePostPermanently(id)
      }
      setPosts(posts.filter(p => !selectedIds.includes(p.id)))
      setSelectedIds([])
      toast.success('선택한 항목이 영구 삭제되었습니다.', { id: toastId })
    } catch (e: any) {
      toast.error(e.message || '일괄 삭제 실패', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleSelection = (postId: string) => {
    setSelectedIds(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    )
  }

  const toggleAllSelection = () => {
    // Select all posts in current tab
    const tabIds = filteredPosts.map(p => p.id)
    if (selectedIds.length === tabIds.length && tabIds.length > 0) {
      setSelectedIds([]) // 전부 해제
    } else {
      setSelectedIds(tabIds) // 전부 선택
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('정말 이 게시물을 영구 삭제하시겠습니까?')) return
    try {
      await deletePostPermanently(postId)
      setPosts(posts.filter(p => p.id !== postId))
      toast.success('게시물이 영구 삭제되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '삭제 실패')
    }
  }

  const handleLoadMore = async () => {
    try {
      const { fetchMoreReviewPosts } = await import('@/app/[locale]/admin/content/actions')
      const morePosts = await fetchMoreReviewPosts(page * 50, 50)
      if (morePosts && morePosts.length > 0) {
        setPosts(prev => {
          const newPosts = [...prev]
          morePosts.forEach((p: any) => {
            if (!newPosts.find(existing => existing.id === p.id)) newPosts.push(p)
          })
          return newPosts
        })
        setPage(p => p + 1)
      } else {
        toast.success('마지막 피드입니다.')
      }
    } catch (e: any) {
      toast.error('더 보기 실패: ' + e.message)
    }
  }

  const now = new Date().getTime()

  const filteredPosts = posts.filter(p => {
    const postTime = new Date(p.created_at).getTime()
    if (activeTab === 'pending_review') return p.status === 'pending_review'
    if (activeTab === 'pending_publish') return p.status === 'pending_publish'
    if (activeTab === 'scheduled') return p.status === 'published' && postTime > now
    if (activeTab === 'published') return p.status === 'published' && postTime <= now
    if (activeTab === 'rejected') return p.status === 'rejected'
    return true
  })

  // 발행 대기 메시지
  const getPendingMessage = (status: string) => {
    if (status === 'pending_publish') return '블로그 발행 대기 중'
    return '다음 자동 승인 시 일괄 발행 예정'
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 상태 필터 탭 - 발행대기가 아닐 때만 표시 (발행대기는 상위 메인 탭으로 분리) */}
      {activeTab !== 'pending_publish' && (
        <div className="flex items-center gap-1.5 border-b border-gray-200 pb-3 flex-wrap">
        <button
          onClick={() => { setActiveTab('scheduled'); setSelectedIds([]); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'scheduled'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>⏰ 발행예약</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'published' && new Date(p.created_at).getTime() > Date.now()).length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('pending_review'); setSelectedIds([]); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'pending_review'
              ? 'bg-gray-700 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>⏳ 피드검토</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'pending_review').length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('published'); setSelectedIds([]); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'published'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>✅ 승인</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'published').length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('rejected'); setSelectedIds([]); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'rejected'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span>🚨 차단</span>
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            {posts.filter(p => p.status === 'rejected').length}
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunCronNow}
            disabled={isRunningCron}
            className={`font-extrabold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-xs ${
              isRunningCron
                ? 'bg-purple-300 text-white cursor-not-allowed animate-pulse'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <span>{isRunningCron ? '크론실행중...' : '크론실행'}</span>
          </button>
        </div>
      </div>
      )}

      {(activeTab === 'pending_review' || activeTab === 'pending_publish') && filteredPosts.length > 0 && (
        <div className="flex items-center gap-3 border-b border-gray-200 pb-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition shadow-xs">
            <input 
              type="checkbox" 
              checked={selectedIds.length > 0 && selectedIds.length === filteredPosts.length}
              onChange={toggleAllSelection}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-700">전체 선택 ({selectedIds.length}/{filteredPosts.length})</span>
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing || selectedIds.length === 0}
              className={`font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 animate-in fade-in ${
                selectedIds.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <span>✅</span>
              <span>선택 {selectedIds.length}개 일괄 승인</span>
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={isProcessing || selectedIds.length === 0}
              className={`font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 animate-in fade-in ${
                selectedIds.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <span>🗑️</span>
              <span>선택 {selectedIds.length}개 삭제</span>
            </button>
          </div>
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
          <p className="text-gray-500 font-medium">해당 상태의 피드가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 w-full">
          {filteredPosts.map((post) => {
            let validationResults: any[] = []
            if (Array.isArray(post.validation_result)) {
              validationResults = post.validation_result
            } else if (typeof post.validation_result === 'string') {
              try {
                const parsed = JSON.parse(post.validation_result)
                if (Array.isArray(parsed)) validationResults = parsed
              } catch(e) {}
            }
            const failedRules = validationResults.filter(r => !r.passed)
            const postTime = new Date(post.created_at).getTime()
            const isPublished = post.status === 'published' && postTime <= now
            const isScheduled = post.status === 'published' && postTime > now
            const isRejected = post.status === 'rejected' || failedRules.length > 0
            const isPending = post.status === 'pending_review' || post.status === 'pending_publish'

            return (
              <div 
                key={post.id} 
                className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col transition ${
                  isRejected 
                    ? 'border-red-300 ring-1 ring-red-200' 
                    : isPublished 
                    ? 'border-emerald-300 ring-1 ring-emerald-100' 
                    : selectedIds.includes(post.id)
                    ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/20'
                    : 'border-gray-300 ring-1 ring-gray-100'
                }`}
              >
                {/* 진단 결과 카드 영역 */}
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* 자가검열 상태 및 위반 사유 안내 */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-gray-700">시스템 모더레이션:</span>

                      {isScheduled ? (
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⏰ 예약됨 ({Math.ceil((postTime - Date.now()) / 60000)}분 후 노출)
                        </span>
                      ) : isPublished ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ✅ 발행 승인 (Published)
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⚠️ 위반 탐지 (발행 차단)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-xs">
                          ⏳ {getPendingMessage(post.status)}
                        </span>
                      )}

                      <div className="flex items-center gap-2 ml-1">
                        {isPending && (
                          <button
                            onClick={() => handleApproveSingle(post.id)}
                            disabled={isProcessing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-2.5 py-1 rounded-full transition shadow-xs flex items-center gap-1 disabled:opacity-50"
                          >
                            <span>바로 예약발행</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={isProcessing}
                          className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-2.5 py-1 rounded-full transition shadow-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          <span>영구삭제</span>
                        </button>
                      </div>
                    </div>

                    {/* 자가검열 위반 항목 상세 사유 목록 */}
                    {failedRules.length > 0 && (
                      <div className="mt-2 bg-red-50 border border-red-200 p-3 rounded-lg flex flex-col gap-1.5">
                        <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                          <span>🚨 위반 항목 {failedRules.length}건이 발견되어 자동발행이 중단되었습니다:</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {failedRules.map((f: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white border border-red-300 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5"
                            >
                              <span className="text-red-600 font-black">✕</span>
                              <span>[{f.rule_label || f.rule_key}]</span>
                              <span className="text-[11px] text-gray-600 font-normal">({f.reason})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isPending && (
                      <div className="mt-1 flex items-center justify-between w-full">
                        {failedRules.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">가이드라인 검증 통과</span>
                            <span className="text-gray-400">|</span>
                            <span>자동 발행 스케줄러 대기 중</span>
                          </div>
                        ) : (
                          <div /> // 빈 공간 차지용
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <label className="text-xs font-bold text-gray-600 cursor-pointer flex items-center gap-1.5 hover:text-indigo-600 transition">
                            선택
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(post.id)}
                              onChange={() => toggleSelection(post.id)}
                              className="w-5 h-5 rounded border-gray-300 text-indigo-600 cursor-pointer focus:ring-indigo-500"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 메인 피드 Card 컴포넌트 */}
                <div className="relative">
                  <PostCard post={post} currentUser={{ id: 'admin' }} hideDeleteButton={true} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 더 보기 버튼 */}
      {filteredPosts.length >= page * 50 && (
        <div className="flex justify-center mt-6">
          <button 
            onClick={handleLoadMore}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition shadow-sm text-sm"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  )
}
