'use client'

import { useRef, useState } from 'react'
import { addComment } from '@/app/[locale]/posts/actions'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'react-hot-toast'
import posthog from 'posthog-js'
import { useActivePersona } from '@/context/ActivePersonaContext'
import { useLocale } from 'next-intl'

const supabase = createClient()

export default function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const locale = useLocale()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)

  const { activeBot, isPiloting } = useActivePersona()
  const isEn = locale === 'en'
  const actionLabel = isEn ? 'Cross' : '탑승'

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) await uploadImage(file)
        break
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadImage(e.target.files[0])
    }
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    const toastId = toast.loading('이미지 업로드 중...')
    try {
      const fileExt = file.name.split('.').pop() || 'png'
      const filePath = `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('comment-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('comment-images')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
      toast.success('이미지가 첨부되었습니다.', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('이미지 업로드에 실패했습니다.', { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleTransform = async () => {
    if (!content.trim()) {
      toast.error(isEn ? 'Please enter a topic or comment draft first.' : '생성할 주제나 내용을 먼저 작성해주세요.')
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
        throw new Error(data.error || (isEn ? 'Failed' : '생성 실패'))
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
    if (imageUrl) {
      formData.append('image_url', imageUrl)
    }
    if (isPiloting && activeBot) {
      formData.append('active_persona_id', activeBot.id)
    }
    await addComment(formData, postId)
    posthog.capture('Comment Added', { postId, hasImage: !!imageUrl, isPiloting })
    formRef.current?.reset()
    setContent('')
    setImageUrl(null)
  }

  return (
    <form ref={formRef} action={handleSubmit} className={`mt-6 border rounded-xl bg-white shadow-sm overflow-hidden transition-colors ${isPiloting ? 'border-purple-300 ring-1 ring-purple-200' : 'border-gray-200'}`}>
      {isPiloting && activeBot && (
        <div className="bg-purple-50 px-3 py-1.5 border-b border-purple-100 flex items-center justify-between text-xs text-purple-800 font-semibold">
          <span className="flex items-center gap-1.5">
            <img src={activeBot.avatar_url} alt="Bot" className="w-4 h-4 rounded-full" />
            🤖 {activeBot.display_name} {isEn ? 'bot commenting' : '봇 명의로 댓글 작성 중'}
          </span>
          <button
            type="button"
            onClick={handleTransform}
            disabled={isTransforming || !content.trim()}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded font-bold shadow-xs transition-colors flex items-center gap-1 text-[11px]"
          >
            <span>🚀</span>
            <span>{isTransforming ? (isEn ? 'Cross...' : '탑승 중...') : (isEn ? `${activeBot.display_name} Cross` : `${activeBot.display_name} 탑승`)}</span>
          </button>
        </div>
      )}

      <div className="p-3">
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          onPaste={handlePaste}
          className="w-full text-sm focus:outline-none resize-none bg-transparent"
          placeholder={isPiloting && activeBot ? (isEn ? `Enter a topic, then click [🚀 ${activeBot.display_name} Cross]...` : `${activeBot.display_name} 시각으로 댓글 작성할 주제를 적고 [🚀 탑승]을 눌러보세요...`) : "Ctrl+V로 캡처한 이미지를 붙여넣거나 댓글을 남겨주세요..."}
          rows={3}
        />
        {imageUrl && (
          <div className="mt-2 relative inline-block">
            <img src={imageUrl} alt="첨부 이미지" className="h-32 object-contain border border-gray-200 rounded" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      <div className="bg-gray-50 border-t border-gray-100 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2">
          <label className="cursor-pointer text-gray-500 hover:text-black transition flex items-center gap-1 text-sm font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            사진 첨부
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
        <button 
          type="submit" 
          disabled={isUploading}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition shadow-sm disabled:bg-gray-400 text-white ${
            isPiloting ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isUploading ? '업로드 중...' : (isPiloting && activeBot ? `${activeBot.display_name}(으)로 작성` : '작성하기')}
        </button>
      </div>
    </form>
  )
}
