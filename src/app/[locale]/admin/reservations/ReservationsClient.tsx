'use client'

import { useState, useTransition } from 'react'
import { updateReservationStatus, deleteReservation, sendAiReviewRequest } from './actions'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '확정',   color: 'bg-green-100 text-green-800' },
  cancelled: { label: '취소',   color: 'bg-red-100 text-red-800' },
  completed: { label: '완료',   color: 'bg-gray-100 text-gray-600' },
}

function formatDate(dt: string) {
  const d = new Date(dt)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function ReservationsClient({ initialData }: { initialData: any[] }) {
  const [filter, setFilter] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState(initialData)
  const [requestMsg, setRequestMsg] = useState<{ [id: string]: string }>({})

  const filtered = filter === 'all' ? data : data.filter(r => r.status === filter)

  function handleStatus(id: string, status: string) {
    startTransition(async () => {
      await updateReservationStatus(id, status)
      setData(prev => prev.map(r => r.id === id ? { ...r, status, review_requested_at: status === 'completed' ? new Date().toISOString() : r.review_requested_at } : r))
    })
  }

  function handleReviewRequest(id: string) {
    startTransition(async () => {
      try {
        const res = await sendAiReviewRequest(id)
        setRequestMsg(prev => ({ ...prev, [id]: '✅ AI 리뷰 요청 발송됨' }))
        setData(prev => prev.map(r => r.id === id ? { ...r, review_requested_at: new Date().toISOString() } : r))
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('이 예약을 삭제할까요?')) return
    startTransition(async () => {
      await deleteReservation(id)
      setData(prev => prev.filter(r => r.id !== id))
    })
  }

  return (
    <div>
      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === s ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABELS[s]?.label}
          </button>
        ))}
      </div>

      {/* 예약 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <p>해당 예약이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">예약 일시</th>
                <th className="px-4 py-3 font-medium">고객명</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">인원</th>
                <th className="px-4 py-3 font-medium">메모</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-indigo-700 font-medium whitespace-nowrap">
                    {formatDate(r.reservation_time)}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.customer_phone || '—'}</td>
                  <td className="px-4 py-3 text-center">{r.party_size}명</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[r.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleStatus(r.id, 'confirmed')}
                          disabled={isPending}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          확정
                        </button>
                      )}
                      {(r.status === 'pending' || r.status === 'confirmed') && (
                        <button
                          onClick={() => handleStatus(r.id, 'cancelled')}
                          disabled={isPending}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          취소
                        </button>
                      )}
                      {r.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatus(r.id, 'completed')}
                          disabled={isPending}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                        >
                          완료
                        </button>
                      )}
                      {r.status === 'completed' && (
                        <button
                          onClick={() => handleReviewRequest(r.id)}
                          disabled={isPending}
                          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200"
                        >
                          {r.review_requested_at ? '리뷰 재요청' : '💬 리뷰 요청'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={isPending}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                    {requestMsg[r.id] && (
                      <p className="text-[10px] text-indigo-600 mt-1 font-medium">{requestMsg[r.id]}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
