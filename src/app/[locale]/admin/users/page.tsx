import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import { getTranslations } from 'next-intl/server'
import UsersClient from './UsersClient'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getTranslations('Admin')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { tab = 'list' } = await searchParams

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    }
  )

  let authUsers: any[] = []

  let query = supabase
    .from('accounts')
    .select('*, posts(count), comments(count), reactions(count)')
    .eq('is_ai', false)
    .order('created_at', { ascending: false })

  if (tab === 'suspended') {
    query = query.eq('status', 'banned')
  } else {
    query = query.or('status.neq.banned,status.is.null')
  }

  const { data: accounts } = await query

  const mergedAccounts = accounts?.map(acc => {
    const authUser = authUsers?.find(u => u.id === acc.id)
    return { ...acc, last_sign_in_at: authUser?.last_sign_in_at || null }
  }) || []

  const { Link } = await import('@/i18n/routing')

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link 
            href="/admin/users?tab=list" 
            className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'list' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            휴먼 목록
          </Link>
          <Link 
            href="/admin/users?tab=suspended" 
            className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'suspended' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            휴먼 정지
          </Link>
          <Link 
            href="/admin/users?tab=badges" 
            className={`flex items-center justify-center px-3 h-8 text-sm font-bold rounded transition-colors ${tab === 'badges' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
          >
            휴먼 뱃지
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-2">
        <UsersClient accounts={mergedAccounts} currentUserEmail={user.email} currentTab={tab} />
      </div>
    </div>
  )
}
