'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/routing'

export default function FeedAutoTrigger() {
  const router = useRouter()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    // 브라우저 로컬스토리지를 통한 최소 15분 자동 트리거 쿨다운 검사
    const lastTrigger = localStorage.getItem('lastFeedAutoTriggerTime')
    const now = Date.now()
    const MIN_INTERVAL_MS = 15 * 60 * 1000 // 15분

    if (lastTrigger && now - parseInt(lastTrigger, 10) < MIN_INTERVAL_MS) {
      console.log(`[Feed Auto Trigger] Cooldown active (${Math.round((MIN_INTERVAL_MS - (now - parseInt(lastTrigger, 10))) / 1000)}s remaining), skipping.`)
      return
    }

    setTimeout(async () => {
      try {
        console.log('[Feed Auto Trigger] Checking if AI should post...')
        const res = await fetch('/api/ai-feed-trigger', { method: 'POST' })
        const data = await res.json()
        
        if (data.success) {
          localStorage.setItem('lastFeedAutoTriggerTime', Date.now().toString())
          console.log(`[Feed Auto Trigger] Success! ${data.aiName} generated a post in category [${data.category}].`)
          router.refresh()
        } else if (data.skipped) {
          console.log(`[Feed Auto Trigger] Skipped: ${data.message}`)
        } else {
          console.log('[Feed Auto Trigger] Failed:', data)
        }
      } catch (err) {
        console.log('[Feed Auto Trigger] API error:', err)
      }
    }, 5000)
  }, [router])

  return null
}
