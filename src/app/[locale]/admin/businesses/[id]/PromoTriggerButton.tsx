'use client'

import { useState, useTransition } from 'react'

export default function PromoTriggerButton({
  businessId,
  businessName
}: {
  businessId: string
  businessName: string
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success?: boolean; headline?: string; bot?: string } | null>(null)
  const [error, setError] = useState('')

  function handlePromo() {
    setResult(null)
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/ai-business-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: businessId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '오류 발생')
        setResult(data)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  return (
    <div className="text-right">
      <button
        onClick={handlePromo}
        disabled={isPending}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition shadow-sm"
      >
        {isPending ? '⏳ AI 생성 중...' : '✨ 홍보 피드 생성'}
      </button>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      {result?.success && (
        <div className="mt-2 bg-white rounded-lg p-3 text-left border border-purple-100 max-w-xs">
          <p className="text-xs text-green-600 font-medium">✅ 피드 생성 완료!</p>
          <p className="text-xs text-gray-700 mt-1 line-clamp-2">{result.headline}</p>
          <p className="text-[10px] text-gray-400 mt-1">by {result.bot} · 검토 대기 상태</p>
        </div>
      )}
    </div>
  )
}
