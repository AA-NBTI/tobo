'use client'

import React, { useState } from 'react'
import { Link } from '@/i18n/routing'
import { toggleFollow } from '@/app/[locale]/users/actions'
import { toast } from 'react-hot-toast'

interface RecommendedUser {
  id: string
  display_name: string
  avatar_url: string
  bio: string
  is_ai: boolean
  level: number
  followers_count: number
}

interface Props {
  users: RecommendedUser[]
  currentUserId?: string
  isMobile?: boolean
}

export default function FollowRecommendationWidget({ users, currentUserId, isMobile = false }: Props) {
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({})

  const handleFollow = async (userId: string) => {
    if (!currentUserId) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    // 낙관적 UI 업데이트
    const isFollowing = followingMap[userId]
    setFollowingMap(prev => ({ ...prev, [userId]: !isFollowing }))
    
    try {
      await toggleFollow(userId)
      toast.success(isFollowing ? '언팔로우 되었습니다.' : '팔로우 되었습니다!')
    } catch (error: any) {
      // 롤백
      setFollowingMap(prev => ({ ...prev, [userId]: isFollowing }))
      toast.error(error.message || '요청 실패')
    }
  }

  if (!users || users.length === 0) return null

  if (isMobile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 lg:hidden overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-xl">✨</span> 추천 크리에이터
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {users.map(user => (
            <div key={user.id} className="min-w-[140px] flex-shrink-0 flex flex-col items-center p-3 border border-gray-100 rounded-lg bg-gray-50 snap-center">
              <Link href={`/users/${user.id}`} className="flex flex-col items-center text-center">
                <img 
                  src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                  alt={user.display_name}
                  className="w-14 h-14 rounded-full mb-2 object-cover border-2 border-white shadow-sm"
                />
                <div className="font-bold text-sm text-gray-900 truncate w-full px-1">{user.display_name}</div>
                <div className="text-xs text-gray-500 mb-2">{user.followers_count || 0} 팔로워</div>
              </Link>
              <button
                onClick={() => handleFollow(user.id)}
                className={`w-full py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
                  followingMap[user.id] 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {followingMap[user.id] ? '팔로잉' : '팔로우'}
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hidden lg:block">
      <div className="p-4 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">✨</span> 추천 크리에이터
        </h3>
        <p className="text-xs text-gray-500 mt-1">지금 핫한 계정들을 만나보세요</p>
      </div>
      
      <div className="flex flex-col divide-y divide-gray-50">
        {users.map(user => (
          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <Link href={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                alt={user.display_name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-gray-900 truncate">{user.display_name}</span>
                  {user.is_ai && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                      봇
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 truncate mt-0.5">
                  {user.bio ? user.bio : `팔로워 ${user.followers_count || 0}명`}
                </span>
              </div>
            </Link>
            
            <button
              onClick={() => handleFollow(user.id)}
              className={`ml-3 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                followingMap[user.id] 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {followingMap[user.id] ? '팔로잉' : '팔로우'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
