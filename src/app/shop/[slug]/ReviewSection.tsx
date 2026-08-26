'use client'

import { useState, useTransition } from 'react'

interface Review {
  id: string
  author_name: string
  rating: number
  content: string
  reservation_id?: string | null
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
  const [customerPhone, setCustomerPhone] = useState('')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!authorName.trim() || !content.trim() || !customerPhone.trim()) {
      setError('예약자 이름, 연락처(끝 4자리 이상), 리뷰 내용을 모두 입력해주세요.')
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
            customerPhone,
            rating,
            content
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '리뷰 등록 실패')

        setReviews(prev => [data.review, ...prev])
        setAuthorName('')
        setCustomerPhone('')
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
          {showForm ? '닫기' : '✍️ 예약 방문자 후기 작성'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
            <span>🛡️</span>
            <span>실제 방문 완료 고객 안심 인증 시스템</span>
          </div>
          <p className="text-[11px] text-gray-500">
            허위 리뷰와 어뷰징을 방지하기 위해 예약 시 등록하신 <strong>이름</strong>과 <strong>연락처</strong>를 대조하여 인증 후 등록됩니다.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-2.5 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">예약자 이름 *</label>
              <input
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="예: 홍길동"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">예약 연락처 (전체 또는 끝 4자리) *</label>
              <input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="예: 010-1234-5678 또는 5678"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">별점 *</label>
              <select
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white font-medium"
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
            <label className="block text-[11px] font-medium text-gray-500 mb-1">솔직한 방문 후기 *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              placeholder="방문 경험, 서비스 만족도, 친절함 등을 솔직하게 작성해주세요."
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white leading-relaxed"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {isPending ? '예약 내역 인증 및 등록 중...' : '인증 후 리뷰 등록'}
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-xs">
          아직 등록된 방문 후기가 없습니다. 실제 방문 후 첫 인증 후기를 남겨보세요!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border-b border-gray-50 last:border-0 pb-5 last:pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-900">{r.author_name}</span>
                  {r.reservation_id ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>✓</span>
                      <span>실제 방문 인증</span>
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">
                      방문자
                    </span>
                  )}
                </div>
                <span className="text-xs text-amber-500 font-bold">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              <div className="text-[10px] text-gray-400 mt-1.5">
                {new Date(r.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              {/* AI 점주 자동 답글 */}
              {r.ai_reply && (
                <div className="mt-3 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 mb-1.5">
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
