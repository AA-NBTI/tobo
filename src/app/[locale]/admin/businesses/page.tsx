import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getBusinesses } from './actions'
import BusinessesClient from './BusinessesClient'
import pkg from '../../../../../package.json'

import { setRequestLocale } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function BusinessesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale) setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) redirect('/')

  const businesses = await getBusinesses()

  return (
    <div className="w-full max-w-5xl mx-auto p-4 py-8 pb-24">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏢 업체 관리</h1>
          <p className="text-gray-500 text-sm mt-1">업체를 등록하고 서비스/예약 슬롯을 관리합니다.</p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
          v{pkg.version}
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <BusinessesClient initialData={businesses} />
      </div>
    </div>
  )
}
