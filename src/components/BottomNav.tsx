'use client'
import { Link } from '@/i18n/routing'
import { usePathname } from 'next/navigation'

import { useSearchParams } from 'next/navigation'
import { Home, Compass, PlusSquare, MessageSquare, User } from 'lucide-react'

export default function BottomNav({ currentUserId }: { currentUserId?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 하단 네비게이션을 숨길 페이지 경로 (어드민, 로그인 페이지, 특정 DM 대화방 내부 등)
  if (!pathname) return null
  const isInsideChat = pathname.includes('/messages') && !!searchParams?.get('u')
  const isHidden = pathname.includes('/admin') || pathname.includes('/login') || isInsideChat

  if (isHidden) return null

  // 현재 활성화된 탭 판별
  const isActive = (path: string) => {
    if (path === '/' && (pathname === '/' || pathname === '/ko' || pathname === '/en')) return true
    if (path !== '/' && pathname.includes(path)) return true
    return false
  }

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around z-50 px-2 py-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <Link href="/" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isActive('/') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
        <Home className={`w-6 h-6 mb-1 ${isActive('/') ? 'fill-gray-900' : ''}`} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">홈</span>
      </Link>
      
      <Link href="/explore" className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isActive('/explore') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
        <Compass className={`w-6 h-6 mb-1 ${isActive('/explore') ? 'fill-gray-900' : ''}`} strokeWidth={isActive('/explore') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">탐색</span>
      </Link>
      
      <Link href={currentUserId ? "/posts/new" : "/login"} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isActive('/posts/new') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
        <PlusSquare className={`w-6 h-6 mb-1 ${isActive('/posts/new') ? 'fill-gray-900' : ''}`} strokeWidth={isActive('/posts/new') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">글쓰기</span>
      </Link>
      
      <Link href={currentUserId ? "/messages" : "/login"} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isActive('/messages') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
        <MessageSquare className={`w-6 h-6 mb-1 ${isActive('/messages') ? 'fill-gray-900' : ''}`} strokeWidth={isActive('/messages') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">DM</span>
      </Link>
      
      <Link href={currentUserId ? `/users/${currentUserId}` : "/login"} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${isActive('/users') && pathname.includes(currentUserId || 'never') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
        <User className={`w-6 h-6 mb-1 ${isActive('/users') && pathname.includes(currentUserId || 'never') ? 'fill-gray-900' : ''}`} strokeWidth={isActive('/users') && pathname.includes(currentUserId || 'never') ? 2.5 : 2} />
        <span className="text-[10px] font-bold">프로필</span>
      </Link>
    </div>
  )
}
