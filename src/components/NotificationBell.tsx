'use client'

import { useEffect, useState, useRef } from 'react'
import { getUserProfileUrl } from '@/utils/user'
import { createClient } from '@/utils/supabase/client'
import { Link } from '@/i18n/routing'
import { markNotificationAsRead, markAllNotificationsAsRead, acceptGroupInvite } from '@/app/notifications/actions'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export default function NotificationBell({ userId }: { userId: string }) {
  const t = useTranslations('Notifications')
  const [notifications, setNotifications] = useState<any[]>([])
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    const supabase = createClient()

    // 1. Fetch initial
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:accounts!notifications_actor_id_fkey(display_name, avatar_url)')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) setNotifications(data)
    }

    fetchNotifications()

    // 2. Realtime subscription
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          console.log('[Realtime Notification] payload received:', payload)
          // Fetch only the actor to avoid race conditions with the newly inserted notification
          supabase
            .from('accounts')
            .select('display_name, avatar_url')
            .eq('id', payload.new.actor_id)
            .single()
            .then(({ data, error }) => {
              console.log('[Realtime Notification] fetched actor:', data, error)
              const newNotification = {
                ...payload.new,
                actor: data || null
              }
              setNotifications(prev => {
                // Prevent duplicate insertions
                if (prev.some(n => n.id === payload.new.id)) return prev;
                return [newNotification, ...prev].slice(0, 20)
              })
            })
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Notification] Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await markNotificationAsRead(id)
  }

  const handleAcceptInvite = async (e: React.MouseEvent, n: any) => {
    e.preventDefault()
    e.stopPropagation()
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item))
    const res = await acceptGroupInvite(n.id, n.target_id)
    if (res.success) {
      router.push(`/messages?group=${n.target_id}`)
      setIsOpen(false)
    }
  }

  const handleReadAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await markAllNotificationsAsRead()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 relative rounded-full hover:bg-gray-100 transition-colors text-gray-700"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">{t('title')}</h3>
            {unreadCount > 0 && (
              <button onClick={handleReadAll} className="text-xs text-blue-600 hover:underline">
                {t('markAllRead')}
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                {t('empty')}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  let textKey = ''
                  let href = '#'
                  
                  if (n.type === 'follow') {
                    textKey = 'follow'
                    href = getUserProfileUrl({ id: n.actor_id, accounts: { username: n.actor?.username } })
                  } else if (n.type === 'reaction') {
                    textKey = 'reaction'
                  } else if (n.type === 'comment') {
                    textKey = 'comment'
                    href = `/posts/${n.target_id}`
                  } else if (n.type === 'group_invite') {
                    textKey = 'group_invite'
                    href = '#'
                  }

                  // 임시 문구 (번역본 업데이트 전)
                  let textStr = textKey ? t(textKey) : ''
                  if (n.type === 'group_invite' && !textStr) textStr = '님께서 그룹 채팅에 초대했습니다.'
                  
                  const actorName = n.actor?.display_name || t('unknownUser')

                  return (
                    <Link 
                      key={n.id} 
                      href={href}
                      onClick={() => handleRead(n.id)}
                      className={`flex items-start gap-3 p-3 transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      {n.actor?.avatar_url ? (
                        <img src={n.actor.avatar_url} className="w-10 h-10 rounded-full object-cover bg-gray-100" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">?</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">
                          {n.type === 'group_invite' 
                            ? <span className="font-semibold">{actorName}</span> 
                            : t('format', { actor: actorName, text: textStr })
                          }
                          {n.type === 'group_invite' && ` ${textStr}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                        {n.type === 'group_invite' && (
                          <div className="mt-2">
                            <button 
                              onClick={(e) => handleAcceptInvite(e, n)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                            >
                              수락하기
                            </button>
                          </div>
                        )}
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
