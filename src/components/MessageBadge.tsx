'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MessageBadge({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const fetchUnreadCount = async () => {
    // get_conversations RPC를 사용하여 전체 언리드 카운트 합산
    const { data } = await supabase.rpc('get_conversations', { p_user_id: userId })
    if (data) {
      const totalUnread = data.reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0)
      setUnreadCount(totalUnread)
    }
  }

  useEffect(() => {
    fetchUnreadCount()

    // 주기적인 폴링 백업 (RPC 호출 실패나 RLS 이슈 대비)
    const pollInterval = setInterval(fetchUnreadCount, 15000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [userId])

  if (unreadCount === 0) return null

  return (
    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center text-center shadow-sm">
      {unreadCount > 99 ? '99+' : unreadCount}
    </div>
  )
}
