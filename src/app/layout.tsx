import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 기반 자동 예약 관리 앱',
  description: 'Gemma AI Core & Supabase RAG Vector DB 기반 자동 예약 관리 보일러플레이트',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
