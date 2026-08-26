'use client'

import { useState, useTransition } from 'react'

interface Review {
  id: string
  author_name: string
  rating: number
  content: string
  ai_reply?: string | null
  created_at: string
}

export default function ReviewSection({
  businessId,
  businessName,
  initialReviews = []
}: {
  businessId: string
  businessName: string
  initialReviews?: Review[]
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [showForm, setShowForm] = useState(false)
  const [authorName, setAuthorName] = useState('')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!authorName.trim() || !content.trim()) {
      setError('이름과 리뷰 내용을 입력해주세요.')
      return
    }
    setError('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            authorName,
            rating,
            content
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '리뷰 등록 실패')

        setReviews(prev => [data.review, ...prev])
        setAuthorName('')
        setContent('')
        setRating(5)
        setShowForm(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">⭐ 방문자 리뷰</h2>
          <span className="text-sm font-semibold text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full">
            ★ {averageRating} ({reviews.length}개)
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
        >
          {showForm ? '닫기' : '✍️ 리뷰 작성'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200/60 rounded-xl p-4 mb-6 space-y-3">
          <h3 className="text-xs font-bold text-gray-700">리뷰 남기기</h3>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">작성자 이름</label>
              <input
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="예: 홍길동"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">별점</label>
              <select
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5점 - 최고예요)</option>
                <option value={4}>⭐⭐⭐⭐ (4점 - 좋아요)</option>
                <option value={3}>⭐⭐⭐ (3점 - 보통이에요)</option>
                <option value={2}>⭐⭐ (2점 - 아쉬워요)</option>
                <option value={1}>⭐ (1점 - 별로예요)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">솔직한 방문 후기</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={2}
              placeholder="서비스, 친절도, 분위기 등 만족하셨던 점을 남겨주세요."
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {isPending ? '등록 중...' : '리뷰 등록 (AI 점주 실시간 답글)'}
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-xs">
          아직 등록된 리뷰가 없습니다. 첫 방문 후기를 남겨보세요!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-gray-800">{r.author_name}</span>
                <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{r.content}</p>
              <div className="text-[10px] text-gray-400 mt-1">
                {new Date(r.created_at).toLocaleDateString()}
              </div>

              {/* AI 점주 자동 답글 */}
              {r.ai_reply && (
                <div className="mt-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 mb-1">
                    <span>🏢</span>
                    <span>{businessName} 점주의 답글</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{r.ai_reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
