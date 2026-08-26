import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/SettingsForm'
import PasswordForm from '@/components/PasswordForm'
import DeleteAccountForm from '@/components/DeleteAccountForm'
import pkg from '../../../../package.json'

import { getTranslations } from 'next-intl/server'

export default async function SettingsPage() {
  const t = await getTranslations('Settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 mt-4 sm:mt-8 mb-20 flex flex-col gap-4 sm:gap-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title')}</h1>
          <span className="bg-gray-100 text-gray-600 text-sm font-bold px-2 py-1 rounded">V{pkg.version}</span>
        </div>
        
        <SettingsForm profile={profile} user={user} />

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold mb-6 text-gray-900">{t('securityAndPw')}</h2>
          <PasswordForm />
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  )
}
