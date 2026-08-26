'use client'

import { useState } from 'react'
import { translateText } from '@/app/[locale]/posts/actions'
import { useLocale } from 'next-intl'
import { toast } from 'react-hot-toast'

export default function TranslateButton({ text, onTranslated }: { text: string, onTranslated: (translated: string) => void }) {
  const [isTranslating, setIsTranslating] = useState(false)
  const locale = useLocale()

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsTranslating(true)
    try {
      const result = await translateText(text, locale)
      onTranslated(result)
    } catch (error) {
      console.error(error)
      toast.error('번역에 실패했습니다.')
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <button 
      onClick={handleTranslate} 
      disabled={isTranslating}
      className="text-xs text-blue-500 font-semibold flex items-center gap-1 hover:underline"
      title="현재 언어로 번역하기"
    >
      {isTranslating ? '번역 중...' : '🌐 번역하기'}
    </button>
  )
}
