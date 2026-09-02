'use client'

import { useState, useTransition } from 'react'
import { updateBusiness } from '../actions'

const CATEGORIES = [
  { value: 'pet_grooming', label: '✂️ 미용/목욕' },
  { value: 'clinic', label: '🏥 병원/클리닉' },
  { value: 'pet_hotel', label: '🏨 호텔/유치원' },
  { value: 'pet_dining', label: '🍽️ 동반 식당/카페' },
  { value: 'pet_pension', label: '🏕️ 동반 펜션' },
]

export default function BusinessEditForm({ business }: { business: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateBusiness(business.id, form)
        setSuccess(true)
        setTimeout(() => {
          window.location.reload()
        }, 600)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">📝 기본 정보 및 설정</h2>
          <p className="text-xs text-gray-500 mt-0.5">상호명, 카테고리, 지역, 전화번호, 주소, 사업자번호 등을 수정합니다.</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
        >
          {isOpen ? '✕ 닫기' : '✏️ 정보 수정하기'}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-200">
          {error && <p className="text-red-500 text-xs bg-red-50 p-2.5 rounded-lg">{error}</p>}
          {success && <p className="text-green-600 text-xs bg-green-50 p-2.5 rounded-lg">✅ 정보가 성공적으로 저장되었습니다!</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">업체명 (상호명) *</label>
              <input
                name="name"
                required
                defaultValue={business.name}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">카테고리 *</label>
              <select
                name="category"
                defaultValue={business.category}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">지역 (동/구 단위) *</label>
              <input
                name="region"
                required
                defaultValue={business.region || ''}
                placeholder="예: 하단동"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">전화번호</label>
              <input
                name="phone"
                defaultValue={business.phone || ''}
                placeholder="예: 051-123-4567"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">상세 주소</label>
              <input
                name="address"
                defaultValue={business.address || ''}
                placeholder="예: 부산 사하구 하단동 123-4"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">사업자등록번호</label>
              <input
                name="business_registration_number"
                defaultValue={business.business_registration_number || ''}
                placeholder="예: 123-45-67890"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">운영 상태 (손님 노출 여부)</label>
              <select
                name="is_active"
                defaultValue={business.is_active ? 'true' : 'false'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              >
                <option value="true">🟢 운영중 (노출)</option>
                <option value="false">🔴 중단 (비노출)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">업체 소개글</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={business.description || ''}
                placeholder="업체에 대한 상세 소개를 작성해주세요..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {isPending ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
