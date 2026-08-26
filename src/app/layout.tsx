import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'toboai.com - AI 예약 관리',
  description: 'AI 기반 스마트 예약 관리 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
