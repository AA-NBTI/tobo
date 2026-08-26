'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'

export default function UserEditor({ user, onSubmit }: { user: any, onSubmit: (formData: FormData) => Promise<void> }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await onSubmit(formData)
      alert('유저 설정이 저장되었습니다.')
      router.refresh()
    } catch (err: any) {
      alert(err.message || '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="userId" value={user.id} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">유저 등급 (Level)</label>
          <select name="level" defaultValue={user.level || '1'} className="w-full border rounded-lg p-2 bg-gray-50 focus:bg-white transition-colors">
            {[1,2,3,4,5,6,7,8,9,10].map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">유저의 활동 등급을 강제로 지정합니다.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">유료/무료 회원 상태</label>
          <select name="membershipType" defaultValue={user.membership_type || 'free'} className="w-full border rounded-lg p-2 bg-gray-50 focus:bg-white transition-colors">
            <option value="free">일반 (Free)</option>
            <option value="paid">유료 회원 (Paid)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">유료 결제 및 프리미엄 혜택 권한을 관리합니다.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">계정 상태 (이용자 정리)</label>
          <select name="status" defaultValue={user.status || 'active'} className="w-full border rounded-lg p-2 bg-gray-50 focus:bg-white transition-colors">
            <option value="active">활성 (Active)</option>
            <option value="banned">일시 정지 (Banned)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">계정 일시 정지 시 커뮤니티 노출이 제한됩니다.</p>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <button 
          type="submit" 
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? '저장 중...' : '변경 사항 저장'}
        </button>
      </div>
    </form>
  )
}
