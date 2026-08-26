'use client'

import { Toaster, toast } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation'

export default function ToastProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    // Check if there's a flash message cookie
    const match = document.cookie.match(new RegExp('(^| )flash_msg=([^;]+)'))
    if (match) {
      // 서버와 프레임워크의 이중 인코딩 중첩을 해결하기 위해 두 번 디코딩합니다.
      const msg = decodeURIComponent(decodeURIComponent(match[2]))

      toast.success(msg)

      // Clear the cookie so it doesn't trigger again
      document.cookie = "flash_msg=; Max-Age=0; path=/;"
    }
  }, [pathname, searchParams, isMounted]) // Re-run on navigation or query changes

  // 서버 렌더링 시에는 null 반환 → Hydration 불일치 방지
  if (!isMounted) return null

  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: '600',
          padding: '12px 24px',
          borderRadius: '8px',
        },
      }}
    />
  )
}