import './globals.css'

// 루트 layout은 html/body를 렌더링하지 않음
// [locale]/layout.tsx가 html/body를 담당 (Hydration mismatch 방지)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
