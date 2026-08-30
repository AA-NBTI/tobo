'use client'

import { useState, useTransition } from 'react'
import { createBusiness, deleteBusiness } from './actions'

const CATEGORIES = [
  { value: 'pet_grooming', label: '✂️ 미용/목욕' },
  { value: 'clinic', label: '🏥 병원/클리닉' },
  { value: 'pet_hotel', label: '🏨 호텔/유치원' },
  { value: 'pet_dining', label: '🍽️ 동반 식당/카페' },
  { value: 'pet_pension', label: '🏕️ 동반 펜션' },
]

export default function BusinessesClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      try {
        await createBusiness(form)
        window.location.reload()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 업체를 삭제할까요?`)) return
    startTransition(async () => {
      await deleteBusiness(id)
      setData(prev => prev.filter(b => b.id !== id))
    })
  }

  return (
    <div>
      {/* 추가 버튼 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          {showForm ? '✕ 닫기' : '+ 업체 추가'}
        </button>
      </div>

      {/* 업체 추가 폼 */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-bold text-gray-800">새 업체 등록</h3>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">업체명 *</label>
              <input name="name" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="예: 홍길동 헤어샵" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">카테고리</label>
              <select name="category" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">전화번호</label>
              <input name="phone" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="010-1234-5678" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
              <input name="address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="서울시 강남구..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">소개</label>
              <textarea name="description" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="업체 소개를 입력하세요..." />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {isPending ? '등록 중...' : '업체 등록'}
          </button>
        </form>
      )}

      {/* 업체 목록 */}
      {data.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏢</div>
          <p>등록된 업체가 없습니다.</p>
          <p className="text-sm mt-1">위 버튼으로 첫 번째 업체를 추가하세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map(b => {
            const cat = CATEGORIES.find(c => c.value === b.category)
            return (
              <div key={b.id} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">{cat?.label || b.category}</div>
                    <h3 className="font-bold text-gray-900 text-base">{b.name}</h3>
                    {b.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {b.phone}</p>}
                    {b.address && <p className="text-xs text-gray-500">📍 {b.address}</p>}
                    {b.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{b.description}</p>}
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.is_active ? '운영중' : '중단'}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <a
                    href={`/ko/admin/businesses/${b.id}`}
                    className="flex-1 text-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    서비스 관리 →
                  </a>
                  <a
                    href={`/shop/${encodeURIComponent(b.slug || b.id)}`}
                    target="_blank"
                    className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium"
                  >
                    공개 페이지
                  </a>
                  <button
                    onClick={() => handleDelete(b.id, b.name)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
