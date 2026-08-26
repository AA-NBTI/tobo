import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/routing'
import UserList from '@/components/UserList'

import Pagination from '@/components/Pagination'

export default async function FollowersPage({ params, searchParams }: { params: Promise<{ id: string , locale: string }>, searchParams: Promise<{ page?: string }> }) {
  const supabase = await createClient()
  const { id , locale} = await params
  
  setRequestLocale(locale);const { page = '1' } = await searchParams
  
  const currentPage = parseInt(page, 10) || 1
  const limit = 15
  const offset = (currentPage - 1) * limit
  
  // Get current user and their followings
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserFollowingIds: string[] = []
  if (user) {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    if (follows) currentUserFollowingIds = follows.map(f => f.following_id)
  }

  // Get target profile with fallback (username or UUID)
  const rawId = decodeURIComponent(id);
  const cleanId = rawId.startsWith('@') ? rawId.substring(1) : rawId

  let profile = null

  const { data: byUsername } = await supabase
    .from('accounts')
    .select('id, display_name, followers_count, username')
    .eq('username', cleanId)
    .maybeSingle()

  profile = byUsername

  if (!profile) {
    const { data: byId } = await supabase
      .from('accounts')
      .select('id, display_name, followers_count, username')
      .eq('id', cleanId)
      .maybeSingle()
    profile = byId
  }

  if (!profile) notFound()

  const targetId = profile.id
  const profileUrlId = profile.username ? `@${profile.username}` : profile.id

  // Get followers: join follows with accounts
  const { data: followersRecords, count } = await supabase
    .from('follows')
    .select('created_at, accounts!follows_follower_id_fkey(id, display_name, avatar_url, bio, is_ai, level, username)', { count: 'exact' })
    .eq('following_id', targetId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const followers = followersRecords?.map(r => r.accounts).filter(Boolean) as any[] || []
  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8 pb-20">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/users/${profileUrlId}`} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.display_name}</h1>
          <p className="text-sm text-gray-500">팔로워 {count || 0}명</p>
        </div>
      </div>

      <UserList users={followers} currentUserId={user?.id} currentUserFollowingIds={currentUserFollowingIds} />
      
      <Pagination totalPages={totalPages} currentPage={currentPage} />
    </div>
  )
}
