import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import HeaderControls from '@/components/HeaderControls'
import { getTranslations } from 'next-intl/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('Header')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasAdmin = isAdmin(user)

  let profile = null
  if (user) {
    const { data } = await supabase.from('accounts').select('display_name, avatar_url, is_onboarded').eq('id', user.id).single()
    profile = data
  }

  const { data: settings } = await supabase.from('site_settings').select('logo_url').eq('id', 'global').single()
  const siteLogo = settings?.logo_url

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── 관리자 전용 풀 헤더 바 (휴먼 / 로봇 / 컨텐츠 / 설정 상시 노출) ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between w-full">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 shrink-0 flex items-center h-full">
            {siteLogo ? (
              <img src={siteLogo} alt="ToboAI Logo" className="h-full max-h-8 w-auto object-contain" />
            ) : (
              <span className="text-xl font-black tracking-tight text-gray-900">tobo<span className="text-blue-600">ai</span></span>
            )}
          </Link>

          <div className="flex items-center gap-4 flex-1 justify-between ml-4 sm:ml-8">
            <HeaderControls 
              user={user} 
              profile={profile} 
              hasAdmin={hasAdmin} 
              t={{
                botManagement: t('botManagement'),
                userManagement: t('userManagement'),
                write: t('write'),
                settings: t('settings'),
                account: t('account'),
                logout: t('logout'),
                login: t('login')
              }} 
            />
          </div>
        </div>
      </header>

      {/* 관리자 메인 컨텐츠 영역 */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
