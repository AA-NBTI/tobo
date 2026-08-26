'use client'

import { useState, useTransition } from 'react'
import { updateReviewReply } from '../actions'

interface Review {
  id: string
  author_name: string
  rating: number
  content: string
  reservation_id?: string | null
  ai_reply?: string | null
  created_at: string
}

export default function ReviewManagerClient({
  businessId,
  initialReviews = []
}: {
  businessId: string
  initialReviews?: Review[]
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpenEdit(r: Review) {
    setEditingId(r.id)
    setReplyText(r.ai_reply || '')
  }

  function handleSaveReply(reviewId: string) {
    startTransition(async () => {
      try {
        await updateReviewReply(reviewId, businessId, replyText)
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ai_reply: replyText } : r))
        setEditingId(null)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <div>
      {reviews.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-xs">
          등록된 고객 후기가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-4 bg-white hover:border-gray-200 transition">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-900">{r.author_name}</span>
                  {r.reservation_id ? (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ 실제 방문 인증
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
              <div className="text-[10px] text-gray-400 mt-1">
                {new Date(r.created_at).toLocaleDateString()}
              </div>

              {/* 답글 영역 */}
              {editingId === r.id ? (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700">점주 답글 작성/수정</label>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="고객님께 전할 답글을 직접 입력하세요..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleSaveReply(r.id)}
                      disabled={isPending}
                      className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                    >
                      {isPending ? '저장 중...' : '답글 저장'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-start justify-between gap-3">
                  {r.ai_reply ? (
                    <div className="flex-1 bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 mb-1">
                        <span>💬</span>
                        <span>등록된 점주 답글</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{r.ai_reply}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">아직 작성된 답글이 없습니다.</span>
                  )}
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition shrink-0"
                  >
                    {r.ai_reply ? '✏️ 답글 수정' : '✍️ 수동 답글 작성'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
