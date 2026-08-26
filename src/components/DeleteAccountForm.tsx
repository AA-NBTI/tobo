'use client'

import { useState } from 'react'
import { deleteAccount } from '@/app/[locale]/settings/actions'
import { useRouter } from '@/i18n/routing'
import toast from 'react-hot-toast'

export default function DeleteAccountForm() {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('정말로 회원 탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.')) {
      return
    }

    setIsPending(true)
    try {
      const res = await deleteAccount()
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('회원 탈퇴가 완료되었습니다.')
        router.push('/')
        router.refresh()
      }
    } catch (e: any) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
      <button 
        type="button" 
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm font-semibold text-red-500 hover:text-red-700 transition"
      >
        {isPending ? '처리 중...' : '회원 탈퇴'}
      </button>
    </div>
  )
}
