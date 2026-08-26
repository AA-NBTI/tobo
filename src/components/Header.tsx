import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import HeaderControls from '@/components/HeaderControls'
import OnboardingModal from '@/components/OnboardingModal'
import { getTranslations, getLocale } from 'next-intl/server';
import BottomNav from '@/components/BottomNav';
import { headers } from 'next/headers'

export default async function Header() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || headersList.get('next-url') || ''
  
  // 메인 챗 홈화면에서는 상단 헤더를 숨겨 클로드와 100% 동일한 풀스크린 뷰 제공
  const isHomePage = pathname === '/' || pathname === '/ko' || pathname === '/en' || pathname === ''

  const t = await getTranslations('Header');
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null;
  if (user) {
    const { data } = await supabase.from('accounts').select('display_name, avatar_url, is_onboarded').eq('id', user.id).single();
    profile = data;
  }

  const hasAdmin = isAdmin(user)
  const { data: settings } = await supabase.from('site_settings').select('logo_url').eq('id', 'global').single()
  const siteLogo = settings?.logo_url

  if (isHomePage) {
    return (
      <>
        {user && profile && profile.is_onboarded === false && (
          <OnboardingModal isOpen={true} />
        )}
      </>
    )
  }

  return (
    <>
      <header className="bg-[#171717] border-b border-[#2b2a27] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-13 flex items-center justify-between w-full">
          <Link href="/" className="text-lg font-serif font-bold tracking-tight text-[#ececec] shrink-0 flex items-center h-full">
            {siteLogo ? (
              <img src={siteLogo} alt="ToboAI Logo" className="h-full max-h-7 w-auto object-contain brightness-200 invert" />
            ) : (
              <span className="text-lg font-serif font-semibold tracking-tight text-[#ececec]">Claude <span className="text-xs font-sans text-[#8e8d8a] ml-1 font-normal">Tobo</span></span>
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
      {user && profile && profile.is_onboarded === false && (
        <OnboardingModal isOpen={true} />
      )}
      <BottomNav currentUserId={user?.id} />
    </>
  )
}
