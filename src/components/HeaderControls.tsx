'use client'
import { Link } from '@/i18n/routing'
import { usePathname } from 'next/navigation'

import { useState } from 'react'
import SearchBar from '@/components/SearchBar'
import NotificationBell from '@/components/NotificationBell'
import MessageBadge from '@/components/MessageBadge'
import PilotSelectorModal from '@/components/PilotSelectorModal'
import { useActivePersona } from '@/context/ActivePersonaContext'

export default function HeaderControls({ user, profile, hasAdmin, t }: { user: any, profile: any, hasAdmin: boolean, t: any }) {
  const pathname = usePathname()
  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false)
  const { activeBot, isPiloting } = useActivePersona()
  
  // If on admin, settings, or write/edit pages, hide search and profile avatar/name
  const currentPath = pathname || ''
  const isHiddenPage = currentPath.includes('/admin') || 
                       currentPath.includes('/settings') || 
                       currentPath.includes('/posts/new') || 
                       currentPath.includes('/edit')

  const closeMenu = () => {
    const cb = document.getElementById('mobile-menu') as HTMLInputElement
    if (cb) cb.checked = false
  }

  // 알림 뱃지를 위해 파일럿 모드일 경우 봇 ID 사용
  const effectiveUserId = isPiloting && activeBot ? activeBot.id : user?.id

  return (
    <>
      {!isHiddenPage ? <SearchBar /> : <div className="flex-1" />}
      
      {user ? (
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <Link href="/explore" className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors relative" title="탐색">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </Link>
          <Link href="/messages" className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors relative" title="메시지">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            {effectiveUserId && <MessageBadge userId={effectiveUserId} />}
          </Link>
          <NotificationBell userId={user.id} />
          
          <label htmlFor="mobile-menu" className="sm:hidden p-2 text-gray-600 cursor-pointer hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </label>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {hasAdmin && (
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <Link 
                  href="/admin/users" 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentPath.includes('/admin/users') ? 'bg-[#0f172a] text-white shadow-xs' : 'text-gray-600 hover:text-black hover:bg-gray-200/60'}`}
                >
                  휴먼
                </Link>
                <Link 
                  href="/admin/robot" 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentPath.includes('/admin/robot') ? 'bg-[#0f172a] text-white shadow-xs' : 'text-gray-600 hover:text-black hover:bg-gray-200/60'}`}
                >
                  로봇
                </Link>
                <Link 
                  href="/admin/content" 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentPath.includes('/admin/content') ? 'bg-[#0f172a] text-white shadow-xs' : 'text-gray-600 hover:text-black hover:bg-gray-200/60'}`}
                >
                  컨텐츠
                </Link>
                <Link 
                  href="/admin" 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${pathname === '/admin' || pathname === '/ko/admin' ? 'bg-[#0f172a] text-white shadow-xs' : 'text-gray-600 hover:text-black hover:bg-gray-200/60'}`}
                >
                  설정
                </Link>
              </div>
            )}
          </div>
            <div className="w-full sm:w-auto">
              <button 
                onClick={async () => {
                  closeMenu();
                  const { createClient } = await import('@/utils/supabase/client');
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="w-full sm:w-auto text-left text-gray-700 hover:text-black transition font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 ml-auto">
          <Link href="/login" className="text-gray-700 hover:text-black transition font-medium text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            {t.login}
          </Link>
        </div>
      )}

      <PilotSelectorModal isOpen={isPilotModalOpen} onClose={() => setIsPilotModalOpen(false)} hasAdmin={hasAdmin} userId={user?.id} />
    </>
  )
}
