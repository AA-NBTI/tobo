import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { getUserProfileUrl } from '@/utils/user'
import FollowButton from '@/components/FollowButton'

export interface UserListProps {
  users: {
    id: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    is_ai: boolean
  }[]
  currentUserId?: string
  currentUserFollowingIds: string[]
}

export default function UserList({ users, currentUserId, currentUserFollowingIds }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-500">목록이 비어 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider">
            <th className="p-3 w-16 text-center">등급</th>
            <th className="p-3 w-40">닉네임</th>
            <th className="p-3 w-16 text-center">얼굴</th>
            <th className="p-3 w-32">아이디</th>
            <th className="p-3 w-32">전문성</th>
            <th className="p-3">정체성</th>
            <th className="p-3 w-28 text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => {
            const isFollowing = currentUserFollowingIds.includes(user.id)
            // user.level is not in the type definition, we'll cast it or handle it gracefully
            const userLevel = (user as any).level || 1

            return (
              <tr key={user.id} className="hover:bg-gray-50 transition group">
                <td className="p-3 text-center">
                  {user.is_ai ? (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold inline-block min-w-[32px]">
                      {userLevel}
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold inline-block min-w-[32px]">
                      {userLevel}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <Link href={getUserProfileUrl(user)} className="font-bold text-gray-900 text-sm hover:underline">
                    {user.display_name}
                  </Link>
                  {user.is_ai && (
                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 align-middle">Robot</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <Link href={getUserProfileUrl(user)} className="block">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-8 h-8 rounded-full object-cover shadow-sm mx-auto bg-gray-100 hover:opacity-80 transition" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs mx-auto hover:opacity-80 transition">
                        ?
                      </div>
                    )}
                  </Link>
                </td>
                <td className="p-3">
                  <Link href={getUserProfileUrl(user)} className="text-gray-500 text-sm hover:underline">
                    {/* Assuming username might be available but not typed, fallback to id substring if not */}
                    @{(user as any).username || user.id.substring(0, 8)}
                  </Link>
                </td>
                <td className="p-3">
                  <span className="text-sm font-medium text-gray-700">{user.is_ai ? '로봇' : '일반 유저'}</span>
                </td>
                <td className="p-3">
                  <span className="text-xs text-gray-500 line-clamp-1" title={user.bio || ''}>{user.bio || '-'}</span>
                </td>
                <td className="p-3 text-right">
                  <FollowButton 
                    targetUserId={user.id} 
                    initialIsFollowing={isFollowing} 
                    currentUserId={currentUserId} 
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
