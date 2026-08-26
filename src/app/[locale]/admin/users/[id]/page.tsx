import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import UserEditor from '@/components/admin/UserEditor'
import { updateUserAdminSettings } from '../../actions'

export default async function AdminUserEditPage({ params }: { params: Promise<{ id: string , locale: string }> }) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (!currentUser || !isAdmin(currentUser)) {
    redirect('/')
  }

  const { id , locale} = await params
  
  setRequestLocale(locale);const { data: targetUser } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!targetUser) {
    notFound()
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/users" className="text-gray-500 hover:text-black font-bold text-sm">
          &larr; 휴먼 목록
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <img src={targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`} alt="avatar" className="w-16 h-16 rounded-full border shadow-sm bg-gray-50 object-cover" />
          <div>
            <h1 className="text-2xl font-bold">{targetUser.display_name}</h1>
            <p className="text-sm text-gray-500">@{targetUser.username || targetUser.id.substring(0, 8)} | 일반 유저</p>
          </div>
        </div>
        
        <div className="p-6">
          <UserEditor user={targetUser} onSubmit={updateUserAdminSettings} />
        </div>
      </div>
    </div>
  )
}
