import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getUserProfileUrl } from '@/utils/user'
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'
import HeaderControls from '@/components/HeaderControls'
import OnboardingModal from '@/components/OnboardingModal'
import { getTranslations, getLocale } from 'next-intl/server';
import BottomNav from '@/components/BottomNav';
import PilotStatusBar from '@/components/PilotStatusBar';

export default async function Header() {
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

  const locale = await getLocale();
  const homeUrl = `/${locale}`;


  return (
    <>
      <header className="bg-[#171717] border-b border-[#2f2f2f] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between w-full">
          <Link href="/" className="text-xl font-bold tracking-tight text-white shrink-0 flex items-center h-full py-2">
            {siteLogo ? (
              <img src={siteLogo} alt="ToboAI Logo" className="h-full max-h-8 w-auto object-contain brightness-200 invert" />
            ) : (
              <span className="text-lg font-bold tracking-tight text-white">Tobo<span className="text-gray-500 text-sm ml-1 font-normal">AI</span></span>
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
