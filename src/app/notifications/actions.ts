'use server'

import { createClient } from '@/utils/supabase/server'

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', user.id)
}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
}

export async function acceptGroupInvite(notificationId: string, roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  // 1. Mark as read
  await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('recipient_id', user.id)

  // 2. Insert into chat_participants
  const { error } = await supabase.from('chat_participants').insert({
    room_id: roomId,
    user_id: user.id
  })
  
  if (!error) {
    // 3. Send arrival message
    const { data: profile } = await supabase.from('accounts').select('display_name').eq('id', user.id).single()
    const name = profile?.display_name || '사용자'
    
    // Get inviter name from notification actor (we need actor_id, but it's easier to just say '초대받은 사용자')
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: null,
      content: `${name} 님이 초대를 수락하여 방에 참여했습니다.`
    })
  }
  
  return { success: !error }
}
