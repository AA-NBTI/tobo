'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function AiImageInjectButton({ targetId, onInject }: { targetId: string, onInject?: (content: string) => void }) {
  const [isInjecting, setIsInjecting] = useState(false)
  const [imageCount, setImageCount] = useState<number>(3) // Default to 3

  const handleInject = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent form submission
    
    // Get current content either via textarea or a provided callback that we assume returns it.
    // For safety, we still read the current DOM value if it exists.
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement
    const content = textarea ? textarea.value : ''
    
    if (!content.trim()) return toast.error('본문이 비어있습니다.')

    setIsInjecting(true)
    const toastId = toast.loading(`✨ AI가 문맥을 분석하여 픽사베이 이미지 ${imageCount}장을 자동 배치 중입니다...`)

    try {
      const res = await fetch('/api/ai-image-inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, count: imageCount })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'API 오류 발생')

      if (onInject) {
        onInject(data.content)
      } else if (textarea) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(textarea, data.content);
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      }
      
      toast.success('이미지 자동 배치가 완료되었습니다!', { id: toastId })
    } catch (err: any) {
      toast.error('오류: ' + err.message, { id: toastId })
    } finally {
      setIsInjecting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 ml-4">
      <div className="flex items-center bg-gray-100 rounded-md border border-gray-200 overflow-hidden">
        <label className="text-[10px] text-gray-500 font-bold px-2 whitespace-nowrap">삽입 개수</label>
        <input 
          type="number" 
          min="1" 
          max="10" 
          value={imageCount}
          onChange={(e) => setImageCount(Number(e.target.value))}
          className="w-12 h-7 text-xs text-center border-l border-gray-200 outline-none"
        />
      </div>
      <button
        type="button"
        onClick={handleInject}
        disabled={isInjecting}
        className="text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-md font-bold hover:from-emerald-600 hover:to-teal-600 transition disabled:opacity-50 shadow-sm flex items-center gap-1"
      >
        {isInjecting ? '삽입 중...' : '✨ AI 이미지 자동배치'}
      </button>
    </div>
  )
}
