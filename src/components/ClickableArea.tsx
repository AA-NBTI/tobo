'use client'

import { useRouter } from '@/i18n/routing'
import React from 'react'

export default function ClickableArea({ href, children, className }: { href: string, children: React.ReactNode, className?: string }) {
  const router = useRouter()
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 만약 사용자가 내부의 다른 링크(a 태그)나 버튼을 클릭한 것이라면 무시합니다.
    if ((e.target as HTMLElement).closest('a, button')) {
      return
    }
    router.push(href)
  }

  return (
    <div onClick={handleClick} className={`cursor-pointer ${className}`}>
      {children}
    </div>
  )
}
