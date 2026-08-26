'use client'

import { useState, useTransition } from 'react'
import { createService, deleteService } from '../actions'

function formatPrice(p: number) {
  return p === 0 ? '무료' : `${p.toLocaleString()}원`
}

export default function ServiceManagerClient({
  businessId,
  initialServices
}: {
  businessId: string
  initialServices: any[]
}) {
  const [services, setServices] = useState(initialServices)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      try {
        await createService(businessId, form)
        window.location.reload()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 서비스를 삭제할까요?`)) return
    startTransition(async () => {
      await deleteService(id, businessId)
      setServices(prev => prev.filter(s => s.id !== id))
    })
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          {showForm ? '✕ 닫기' : '+ 서비스 추가'}
        </button>
      </div>

      {/* 서비스 추가 폼 */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-bold text-gray-800">새 서비스 등록</h3>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">서비스명 *</label>
              <input name="name" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="예: 커트, 펌, 마사지 60분" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">소요 시간 (분)</label>
              <input name="duration_minutes" type="number" defaultValue="60" min="10" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">가격 (원)</label>
              <input name="price" type="number" defaultValue="0" min="0" step="1000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">최대 인원</label>
              <input name="max_party_size" type="number" defaultValue="1" min="1" max="100" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
              <textarea name="description" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="서비스 설명..." />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {isPending ? '등록 중...' : '서비스 등록'}
          </button>
        </form>
      )}

      {/* 서비스 목록 */}
      {services.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">🛎</div>
          <p>등록된 서비스가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition">
              <div>
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  ⏱ {s.duration_minutes}분 · 💰 {formatPrice(s.price)} · 👤 최대 {s.max_party_size}명
                </div>
                {s.description && <div className="text-xs text-gray-400 mt-1">{s.description}</div>}
              </div>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                disabled={isPending}
                className="ml-4 px-3 py-1.5 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
