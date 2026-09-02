'use client'

import { useState, useTransition } from 'react'
import { createBusiness, updateBusiness, deleteBusiness } from './actions'

const CATEGORIES = [
  { value: 'pet_grooming', label: '✂️ 미용/목욕' },
  { value: 'clinic', label: '🏥 병원/클리닉' },
  { value: 'pet_hotel', label: '🏨 호텔/유치원' },
  { value: 'pet_dining', label: '🍽️ 동반 식당/카페' },
  { value: 'pet_pension', label: '🏕️ 동반 펜션' },
]

type TabType = 'all' | 'pending'

export default function BusinessesClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState<any | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')
  const [tab, setTab] = useState<TabType>('pending')
  const [approving, setApproving] = useState<string | null>(null)

  const pendingList = data.filter(b => b.onboarding_status === 'pending_review')
  const allList = data

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

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingBusiness) return
    const form = new FormData(e.currentTarget)
    setEditError('')
    startTransition(async () => {
      try {
        await updateBusiness(editingBusiness.id, form)
        // 로컬 데이터 즉시 반영
        setData(prev => prev.map(b => {
          if (b.id === editingBusiness.id) {
            return {
              ...b,
              name: form.get('name') as string,
              category: form.get('category') as string,
              region: form.get('region') as string,
              phone: form.get('phone') as string,
              address: form.get('address') as string,
              business_registration_number: form.get('business_registration_number') as string,
              description: form.get('description') as string,
              is_active: form.get('is_active') === 'true',
            }
          }
          return b
        }))
        setEditingBusiness(null)
      } catch (err: any) {
        setEditError(err.message)
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

  async function handleApprove(businessId: string, name: string) {
    if (!confirm(`"${name}"을 승인하시겠어요?\nonboarding_status → approved, is_active → true`)) return
    setApproving(businessId)
    try {
      const res = await fetch('/api/admin/approve-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setData(prev => prev.map(b =>
        b.id === businessId
          ? { ...b, onboarding_status: 'approved', is_active: true }
          : b
      ))
      alert(`✅ "${name}" 승인 완료!\nDB: onboarding_status = approved, is_active = true`)
    } catch (err: any) {
      alert(`❌ 승인 실패: ${err.message}`)
    } finally {
      setApproving(null)
    }
  }

  async function handleRevoke(businessId: string, name: string) {
    if (!confirm(`"${name}" 승인을 취소하시겠어요?`)) return
    setApproving(businessId)
    try {
      const res = await fetch('/api/admin/approve-business', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setData(prev => prev.map(b =>
        b.id === businessId
          ? { ...b, onboarding_status: 'pending_review', is_active: false }
          : b
      ))
    } catch (err: any) {
      alert(`❌ 취소 실패: ${err.message}`)
    } finally {
      setApproving(null)
    }
  }

  function statusBadge(b: any) {
    if (b.onboarding_status === 'approved') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">✅ 승인됨</span>
    }
    if (b.onboarding_status === 'pending_review') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">⏳ 검토 대기</span>
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">{b.onboarding_status || '알 수 없음'}</span>
  }

  function BusinessCard({ b }: { b: any }) {
    const cat = CATEGORIES.find(c => c.value === b.category)
    return (
      <div className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 mb-0.5">{cat?.label || b.category}</div>
              <h3 className="font-bold text-gray-900 text-base truncate">{b.name}</h3>
              {b.region && <p className="text-xs text-indigo-600 font-medium mt-0.5">📍 {b.region}</p>}
              {b.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {b.phone}</p>}
              {b.address && <p className="text-xs text-gray-500">🏢 {b.address}</p>}
              {b.business_registration_number && (
                <p className="text-xs text-gray-400 mt-1">사업자: {b.business_registration_number}</p>
              )}
              {b.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2 bg-gray-50 p-2 rounded-lg">{b.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {b.is_active ? '운영중' : '중단'}
              </span>
              {statusBadge(b)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-50">
          {b.onboarding_status === 'pending_review' && (
            <button
              id={`approve-btn-${b.id}`}
              onClick={() => handleApprove(b.id, b.name)}
              disabled={approving === b.id}
              className="flex-1 px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
            >
              {approving === b.id ? '처리 중...' : '✅ 승인 처리'}
            </button>
          )}
          {b.onboarding_status === 'approved' && (
            <button
              onClick={() => handleRevoke(b.id, b.name)}
              disabled={approving === b.id}
              className="px-3 py-1.5 text-xs bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition font-medium"
            >
              승인 취소
            </button>
          )}
          <button
            onClick={() => setEditingBusiness(b)}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition"
          >
            ✏️ 정보 수정
          </button>
          <a
            href={`/ko/admin/businesses/${b.id}`}
            className="text-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            서비스 관리 →
          </a>
          {b.onboarding_status === 'approved' && (
            <a
              href={`/shop/${encodeURIComponent(b.slug || b.id)}`}
              target="_blank"
              className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium"
            >
              공개 페이지
            </a>
          )}
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
  }

  return (
    <div>
      {/* 탭 + 수동 등록 버튼 */}
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-3">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'pending'
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          ⏳ 승인 대기
          {pendingList.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-amber-600 text-white rounded-full text-[10px] font-bold">
              {pendingList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            tab === 'all'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          전체 업체 ({allList.length})
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            {showForm ? '✕ 닫기' : '+ 수동 등록'}
          </button>
        </div>
      </div>

      {/* 업체 수정 모달 / 폼 */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">✏️ 업체 정보 수정</h3>
                <p className="text-xs text-gray-500 mt-0.5">업체의 기본 정보 및 상태를 업데이트합니다.</p>
              </div>
              <button
                onClick={() => setEditingBusiness(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {editError && <p className="text-red-500 text-xs bg-red-50 p-2.5 rounded-lg mb-4">{editError}</p>}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">업체명 (상호명) *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingBusiness.name}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">카테고리 *</label>
                  <select
                    name="category"
                    defaultValue={editingBusiness.category}
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
                    defaultValue={editingBusiness.region || ''}
                    placeholder="예: 하단동"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">전화번호</label>
                  <input
                    name="phone"
                    defaultValue={editingBusiness.phone || ''}
                    placeholder="예: 051-123-4567"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">상세 주소</label>
                  <input
                    name="address"
                    defaultValue={editingBusiness.address || ''}
                    placeholder="예: 부산 사하구 하단동 123-4"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">사업자등록번호</label>
                  <input
                    name="business_registration_number"
                    defaultValue={editingBusiness.business_registration_number || ''}
                    placeholder="예: 123-45-67890"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">운영 상태 (손님 노출 여부)</label>
                  <select
                    name="is_active"
                    defaultValue={editingBusiness.is_active ? 'true' : 'false'}
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
                    defaultValue={editingBusiness.description || ''}
                    placeholder="업체에 대한 상세 소개를 작성해주세요..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
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
          </div>
        </div>
      )}

      {/* 수동 등록 폼 */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-bold text-gray-800">새 업체 수동 등록 (관리자 직접 입력)</h3>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">지역 (동/구 단위)</label>
              <input name="region" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="예: 하단동 또는 사하구" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">전화번호</label>
              <input name="phone" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="010-1234-5678" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
              <input name="address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="부산 사하구 하단동..." />
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

      {/* 승인 대기 탭 */}
      {tab === 'pending' && (
        <>
          {pendingList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-semibold">검토 대기 중인 업체가 없습니다.</p>
              <p className="text-sm mt-1">모든 업체가 승인된 상태예요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ 아래 업체들은 사업자등록 정보를 검수한 후 승인해 주세요. 승인 전까지 손님 화면에 노출되지 않습니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingList.map(b => <BusinessCard key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* 전체 업체 탭 */}
      {tab === 'all' && (
        <>
          {allList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🏢</div>
              <p>등록된 업체가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allList.map(b => <BusinessCard key={b.id} b={b} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
