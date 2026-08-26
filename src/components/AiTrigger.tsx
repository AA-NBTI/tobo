'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'

export default function AiTrigger({ postId, commentCount, lastCommentIsAi }: { postId: string, commentCount: number, lastCommentIsAi?: boolean }) {
  const locale = useLocale()
  const router = useRouter()
  const lastTriggeredCommentCount = useRef(-1)

  useEffect(() => {
    // 댓글이 있고 마지막 댓글이 AI라면 무한 루프 방지를 위해 멈춤
    if (commentCount > 0 && lastCommentIsAi) return

    // 이미 이 댓글 수에서 알람을 보냈다면 중복 발송 방지
    if (lastTriggeredCommentCount.current === commentCount) return

    console.log(`[AI Trigger] 서버로 봇 호출 신호 즉시 발송! (Post: ${postId})`)
    lastTriggeredCommentCount.current = commentCount

    // 프론트엔드의 불안정한 타이머를 제거하고 즉시 서버로 신호를 보냅니다.
    // 서버가 알아서 15초를 대기하고 캐시를 갱신합니다.
    const triggerAi = async () => {
      try {
        const res = await fetch('/api/ai-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, locale })
        })
        const data = await res.json()

        if (data.success) {
          console.log(`[AI Trigger] 성공! ${data.aiName} 봇 작동 완료. (Realtime 화면 업데이트 대기 중...)`)
          router.refresh()
        } else if (data.message === 'Already processing') {
          console.log(`[AI Trigger] 이미 다른 프로세스가 생성 중입니다. 8초 후 화면을 새로고침합니다.`)
          setTimeout(() => {
            router.refresh()
          }, 8000)
        } else {
          console.log('[AI Trigger] 건너뜀/에러:', data)
        }
      } catch (err) {
        console.error('[AI Trigger] API 호출 실패:', err)
      }
    }

    triggerAi()
  }, [postId, commentCount, lastCommentIsAi])

  return null
}