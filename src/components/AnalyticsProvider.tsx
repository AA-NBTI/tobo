'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // 세션 ID 생성 (브라우저 세션 동안 유지)
    let sessionId = sessionStorage.getItem('site_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)
      sessionStorage.setItem('site_session_id', sessionId)
    }

    // 서버로 방문 기록 전송
    const trackVisit = async () => {
      try {
        await fetch('/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            path: pathname
          })
        })
      } catch (err) {
        console.error('Failed to track visit:', err)
      }
    }

    trackVisit()
  }, [pathname])

  return <>{children}</>
}
