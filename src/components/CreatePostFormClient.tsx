'use client'

import { useRef, useState } from 'react'
import { createPost } from '@/app/[locale]/posts/actions'
import ImageUploadPreview from '@/components/ImageUploadPreview'
import posthog from 'posthog-js'
import { toast } from 'react-hot-toast'
import { useActivePersona } from '@/context/ActivePersonaContext'
import { useLocale } from 'next-intl'

export default function CreatePostFormClient({ t }: { t: any }) {
  const formRef = useRef<HTMLFormElement>(null)
  const locale = useLocale()
  const [headline, setHeadline] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  const { activeBot, isPiloting } = useActivePersona()
  const isEn = locale === 'en'
  const actionLabel = isEn ? 'Cross' : '탑승'

  const handleTransform = async () => {
    if (!content.trim()) {
      toast.error(isEn ? 'Please enter a topic or text first.' : '생성할 주제나 글을 먼저 입력하세요.')
      return
    }
    if (!activeBot) return

    setIsTransforming(true)
    const toastId = toast.loading(isEn ? `${activeBot.display_name} ${actionLabel} in progress...` : `${activeBot.display_name} 탑승 생성 중...`)

    try {
      const res = await fetch('/api/ai-persona-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, botId: activeBot.id })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Failed to process' : '생성 실패'))
      }

      setContent(data.transformed)
      toast.success(isEn ? `${activeBot.display_name} ${actionLabel} Complete!` : `${activeBot.display_name} 탑승 완료!`, { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || (isEn ? 'Failed' : '탑승 실패'), { id: toastId })
    } finally {
      setIsTransforming(false)
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      if (isPiloting && activeBot) {
        formData.append('active_persona_id', activeBot.id)
      }
      await createPost(formData)
      posthog.capture('Post Created', {
        hasUrl: !!formData.get('url'),
        hasImage: !!formData.get('image_url'),
        isPiloting
      })
    } catch (e: any) {
      // Next.js redirect() 예외 신호는 리드로우하여 정상 페이지 이동 처리
      if (e?.digest?.startsWith('NEXT_REDIRECT') || e?.message?.includes('NEXT_REDIRECT')) {
        throw e
      }
      console.error('[CreatePostFormClient] Submit error:', e)
      toast.error(e?.message || '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
      {isPiloting && activeBot && (
        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg flex items-center justify-between text-xs text-purple-900 font-semibold">
          <span className="flex items-center gap-1.5">
            <img src={activeBot.avatar_url} alt="Bot" className="w-5 h-5 rounded-full" />
            🤖 <strong>{activeBot.display_name}</strong> 봇 명의로 게시글이 작성됩니다.
          </span>
        </div>
      )}

      <div>
        <label htmlFor="headline" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t.headline}</label>
        <input
          id="headline"
          name="headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          required
          placeholder={t.headlinePlaceholder}
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">{t.content}</label>
          {isPiloting && activeBot && (
            <button
              type="button"
              onClick={handleTransform}
              disabled={isTransforming || !content.trim()}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <span>🚀</span>
              <span>{isTransforming ? (isEn ? 'Cross...' : '탑승 중...') : (isEn ? `${activeBot.display_name} Cross` : `${activeBot.display_name} 탑승`)}</span>
            </button>
          )}
        </div>
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          placeholder={isPiloting && activeBot ? (isEn ? `Write a topic or notes, then click [🚀 ${activeBot.display_name} Cross]...` : `${activeBot.display_name} 시각으로 작성할 주제나 메모를 적은 후 [🚀 탑승]을 눌러보세요...`) : t.contentPlaceholder}
          rows={5}
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">
          {t.category}
        </label>
        <select
          id="category"
          name="category"
          defaultValue="free"
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium text-sm sm:text-base text-gray-700"
        >
          <option value="free">자유/일상 (Free)</option>
          <option value="politics">정치 (Politics)</option>
          <option value="economy">경제 (Economy)</option>
          <option value="society">사회 (Society)</option>
          <option value="tech">IT/기술 (Tech)</option>
          <option value="world">세계 (World)</option>
          <option value="entertainment">연예 (Entertainment)</option>
          <option value="sports">스포츠 (Sports)</option>
          <option value="culture">생활/문화 (Culture)</option>
          <option value="opinion">오피니언 (Opinion)</option>
        </select>
      </div>
      <div>
        <label htmlFor="url" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t.sourceUrl}</label>
        <input id="url" name="url" type="url" placeholder={t.sourceUrlPlaceholder} className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" />
      </div>

      {/* 여론조사(Poll) 추가 UI */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-bold text-gray-800">📊 투표(Poll) 추가하기</label>
          <button 
            type="button" 
            onClick={() => setPollEnabled(!pollEnabled)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full transition-colors"
          >
            {pollEnabled ? '투표 취소' : '+ 투표 만들기'}
          </button>
        </div>

        {pollEnabled && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <input 
              name="poll_question" 
              type="text" 
              placeholder="투표 질문을 입력하세요 (예: 가장 기대되는 기능은?)" 
              className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
              required={pollEnabled}
            />
            <div className="space-y-2">
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium text-sm w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`선택지 ${idx + 1}`}
                    className="flex-1 border border-gray-200 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                    required={pollEnabled}
                  />
                  {idx > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 4 && (
              <button 
                type="button" 
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 mt-1"
              >
                + 선택지 추가
              </button>
            )}
            {/* 서버 전송용 히든 필드 */}
            <input type="hidden" name="poll_options" value={JSON.stringify(pollOptions)} />
          </div>
        )}
      </div>
      
      <ImageUploadPreview />
      <button type="submit" disabled={isSubmitting} className="bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-1 sm:mt-2 disabled:bg-gray-400">
        {isSubmitting ? '...' : t.submit}
      </button>
    </form>
  )
}
