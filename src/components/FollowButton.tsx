'use client'

import { useState } from 'react'
import { toggleFollow } from '@/app/[locale]/users/actions'
import { toast } from 'react-hot-toast'

export default function FollowButton({ 
  targetUserId, 
  initialIsFollowing, 
  currentUserId 
}: { 
  targetUserId: string, 
  initialIsFollowing: boolean, 
  currentUserId?: string 
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (currentUserId === targetUserId) {
    return null; // 자기 자신에게는 팔로우 버튼 숨김
  }

  const handleToggle = async () => {
    if (!currentUserId) {
      toast.error('로그인이 필요합니다.')
      return
    }

    // Optimistic Update
    setIsFollowing(!isFollowing)
    setLoading(true)

    try {
      const result = await toggleFollow(targetUserId)
      // 만약 봇이 맞팔로우를 했다면 비동기로 환영 첫 댓글 API 호출 (fire-and-forget)
      if (result?.botFollowedBack) {
        fetch('/api/ai-follow-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: targetUserId, userId: currentUserId })
        }).catch(e => console.error('AI Follow Reply Error:', e))
      }
    } catch (error: any) {
      toast.error('팔로우 처리에 실패했습니다.')
      setIsFollowing(isFollowing) // revert
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        px-4 py-1.5 rounded-full font-bold text-sm transition-all duration-200 border
        ${isFollowing 
          ? (isHovered 
              ? 'bg-red-50 text-red-600 border-red-200' 
              : 'bg-white text-gray-900 border-gray-300')
          : 'bg-black text-white border-black hover:bg-gray-800'
        }
      `}
    >
      {isFollowing ? (isHovered ? '언팔로우' : '팔로잉') : '팔로우'}
    </button>
  )
}
