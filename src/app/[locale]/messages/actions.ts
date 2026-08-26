'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { isAdmin } from '@/utils/auth'

// Service role 클라이언트 - is_ai 조회 시 RLS 우회 (봇 계정은 RLS 정책에 걸릴 수 있음)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 파일럿(탑승) 상태를 확인하고 권한이 있는지 검증하는 유틸리티
async function getPilotInfo(user: any) {
  const cookieStore = await cookies()
  const pilotBotId = cookieStore.get('active_persona_id')?.value || null
  const hasAdmin = isAdmin(user)
  
  let isPiloting = false
  let effectiveUserId = user.id

  if (pilotBotId) {
    if (hasAdmin) {
      effectiveUserId = pilotBotId
      isPiloting = true
    } else {
      // 관리자가 아니면 소유자인지 확인
      const { data: botAccount } = await supabaseAdmin
        .from('accounts')
        .select('claimed_by_user_id')
        .eq('id', pilotBotId)
        .single()

      if (botAccount && botAccount.claimed_by_user_id === user.id) {
        effectiveUserId = pilotBotId
        isPiloting = true
      }
    }
  }

  return { effectiveUserId, isPiloting }
}

export async function sendMessage(receiverId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { effectiveUserId: effectiveSenderId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 1. Find existing 1:1 room
  // get_conversations는 숨겨진 방(hidden_at IS NOT NULL)을 반환하지 않으므로, 
  // 방이 중복 생성되는 버그를 막기 위해 chat_participants를 직접 교차 검색합니다.
  const { data: myRooms } = await dbClient
    .from('chat_participants')
    .select('room_id, chat_rooms!inner(is_group, created_at)')
    .eq('user_id', effectiveSenderId)

  let roomId = null
  if (myRooms && myRooms.length > 0) {
    // 중복 방이 있을 경우 가장 최근에 생성된 방을 우선 사용하기 위해 정렬
    myRooms.sort((a, b) => {
      const aTime = new Date((Array.isArray(a.chat_rooms) ? a.chat_rooms[0] : a.chat_rooms)?.created_at || 0).getTime()
      const bTime = new Date((Array.isArray(b.chat_rooms) ? b.chat_rooms[0] : b.chat_rooms)?.created_at || 0).getTime()
      return bTime - aTime
    })

    for (const r of myRooms) {
      const roomInfo = Array.isArray(r.chat_rooms) ? r.chat_rooms[0] : r.chat_rooms
      if (roomInfo && (roomInfo as any).is_group === false) {
        const { data: otherP } = await dbClient
          .from('chat_participants')
          .select('user_id')
          .eq('room_id', r.room_id)
          .eq('user_id', receiverId)
          .maybeSingle()
        if (otherP) {
          roomId = r.room_id
          break
        }
      }
    }
  }

  // 2. Create room if it doesn't exist
  if (!roomId) {
    const { data: newRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .insert({ is_group: false })
      .select('id')
      .single()
      
    if (roomError) throw new Error('방 생성 실패')
    roomId = newRoom.id

    await supabaseAdmin.from('chat_participants').insert([
      { room_id: roomId, user_id: effectiveSenderId },
      { room_id: roomId, user_id: receiverId }
    ])
  } else {
    // 상대방이 숨겼을 수 있으므로 participant 복구
    await dbClient.from('chat_participants')
      .update({ hidden_at: null })
      .eq('room_id', roomId)
  }

  // 3. Insert message
  const { error } = await dbClient
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: effectiveSenderId,
      content: content.trim()
    })

  if (error) {
    console.error('sendMessage db error:', error)
    throw new Error('메시지 전송에 실패했습니다: ' + error.message + ' (Hint: ' + (error.hint || '') + ')')
  }

  // 봇 자동 답장 트리거
  const { data: receiverAccount } = await supabaseAdmin
    .from('accounts')
    .select('id, is_ai, display_name')
    .eq('id', receiverId)
    .single()

  revalidatePath('/messages')
  
  return { success: true, isAi: receiverAccount?.is_ai === true, roomId }
}

export async function markAsRead(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  const { data: rooms } = await dbClient
    .rpc('get_conversations', { p_user_id: effectiveUserId })

  const roomId = rooms?.find((r: any) => r.is_group === false && r.other_user_id === otherUserId)?.room_id

  if (roomId) {
    await dbClient
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', effectiveUserId)
      
    revalidatePath('/messages')
  }
}

export async function deleteConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  const { data: rooms } = await dbClient
    .rpc('get_conversations', { p_user_id: effectiveUserId })

  const roomId = rooms?.find((r: any) => r.is_group === false && r.other_user_id === otherUserId)?.room_id

  if (roomId) {
    await dbClient
      .from('chat_participants')
      .update({ hidden_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', effectiveUserId)

    revalidatePath('/messages')
  }
}

export async function leaveGroupChat(roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')
  
  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  await dbClient
    .from('chat_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', effectiveUserId)

  // 방에 남은 참여자 확인
  const { data: remainingParticipants } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id, accounts!inner(is_ai)')
    .eq('room_id', roomId)

  // 남은 사람이 없거나, 인간 멤버(is_ai === false)가 0명이면 방 자체를 폭파(삭제)
  const humanCount = (remainingParticipants || []).filter((p: any) => p.accounts && (p.accounts.is_ai === false || p.accounts.is_ai === null)).length
  if (!remainingParticipants || remainingParticipants.length === 0 || humanCount === 0) {
    console.log(`🧹 [Ghost Room Explosion] 인간 유저 퇴장 후 인간 멤버 0명이 되어 그룹방(${roomId})을 자동 폭파 삭제합니다.`)
    await supabaseAdmin.from('chat_rooms').delete().eq('id', roomId)
    revalidatePath('/messages')
    return
  }

  // 시스템 메시지 (누가 나갔는지)
  const userName = user.user_metadata?.display_name || '사용자'
  await supabaseAdmin.from('chat_messages').insert({
    room_id: roomId,
    sender_id: null, // 시스템 봇
    content: `${userName} 님이 퇴장했습니다.`
  })

  revalidatePath('/messages')
}

export async function inviteToGroupChat(roomId: string, userIdsToInvite: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  // Check if current user is in the room
  const { data: participants } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id')
    .eq('room_id', roomId)

  if (!participants?.some(p => p.user_id === user.id)) {
    throw new Error('권한이 없습니다.')
  }

  // 1. Get info about users to invite
  const { data: invitedUsers } = await supabaseAdmin.from('accounts').select('id, display_name, is_ai').in('id', userIdsToInvite)
  if (!invitedUsers || invitedUsers.length === 0) return

  const aiUsers = invitedUsers.filter(u => u.is_ai)
  const humanUsers = invitedUsers.filter(u => !u.is_ai)
  const inviterName = user.user_metadata?.display_name || '사용자'

  // 2. Add AI users directly to room
  if (aiUsers.length > 0) {
    const inserts = aiUsers.map(u => ({ room_id: roomId, user_id: u.id }))
    await supabaseAdmin.from('chat_participants').insert(inserts)

    // Send AI arrival message
    const names = aiUsers.map(u => u.display_name).join(', ')
    await supabaseAdmin.from('chat_messages').insert({
      room_id: roomId,
      sender_id: null,
      content: `봇 ${names} 님이 방에 참여했습니다. (${inviterName}님의 초대)`
    })
  }

  // 3. Send Notification to Human users
  if (humanUsers.length > 0) {
    const notifInserts = humanUsers.map(u => ({
      recipient_id: u.id,
      actor_id: user.id,
      type: 'group_invite',
      target_id: roomId,
    }))
    await supabaseAdmin.from('notifications').insert(notifInserts)
  }

  revalidatePath('/messages')
}

export async function getMessages(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 방을 찾기 위해 모든 participant 검색 (숨겨진 방 포함)
  const { data: participants } = await dbClient
    .from('chat_participants')
    .select('room_id, chat_rooms!inner(is_group, created_at)')
    .eq('user_id', effectiveUserId)
    
  if (!participants) return []

  // 중복 방이 있을 경우 가장 최근에 생성된 방을 우선 사용하기 위해 정렬
  participants.sort((a, b) => {
    const aTime = new Date((Array.isArray(a.chat_rooms) ? a.chat_rooms[0] : a.chat_rooms)?.created_at || 0).getTime()
    const bTime = new Date((Array.isArray(b.chat_rooms) ? b.chat_rooms[0] : b.chat_rooms)?.created_at || 0).getTime()
    return bTime - aTime
  })

  // 내가 속한 1:1 방들 중 상대방이 있는 방 찾기
  let targetRoomId = null
  for (const p of participants) {
    const roomInfo = Array.isArray(p.chat_rooms) ? p.chat_rooms[0] : p.chat_rooms
    if (roomInfo && (roomInfo as any).is_group === false) {
      const { data: otherP } = await dbClient
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', p.room_id)
        .eq('user_id', otherUserId)
        .maybeSingle()
        
      if (otherP) {
        targetRoomId = p.room_id
        // 중요한 버그 수정: 여러 방이 중복 생성되었을 경우 가장 최신 방을 가져오도록 해야 하지만,
        // 위에서 sendMessage를 수정하여 이제 방이 1개만 존재하도록 보장했습니다.
        break
      }
    }
  }

  if (!targetRoomId) return []

  // 현재 유저의 hidden_at 가져오기
  const { data: myParticipant } = await dbClient
    .from('chat_participants')
    .select('hidden_at')
    .eq('room_id', targetRoomId)
    .eq('user_id', effectiveUserId)
    .single()

  let query = dbClient
    .from('chat_messages')
    .select('*')
    .eq('room_id', targetRoomId)

  if (myParticipant?.hidden_at) {
    query = query.gt('created_at', myParticipant.hidden_at)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    console.error('getMessages error:', error)
    return []
  }

  return data || []
}



export async function createGroupChat(name: string, participantIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }
  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase
  // 방 생성은 RLS RETURNING 이슈 방지를 위해 Admin 클라이언트 사용
  const { data: newRoom, error: roomError } = await supabaseAdmin
    .from('chat_rooms')
    .insert({ name: name || null, is_group: true, admin_id: effectiveUserId })
    .select('id')
    .single()
    
  if (roomError) {
    console.error('Room creation error:', roomError)
    throw new Error(`그룹 채팅방 생성 실패: ${roomError.message}`)
  }
  const roomId = newRoom.id

  // 참가자 추가 (나 포함)
  const allParticipants = Array.from(new Set([effectiveUserId, ...participantIds]))
  
  const participantData = allParticipants.map(id => ({
    room_id: roomId,
    user_id: id
  }))

  const { error: partError } = await supabaseAdmin
    .from('chat_participants')
    .insert(participantData)

  if (partError) {
    console.error('Participant insert error:', partError)
    throw new Error('참여자 추가 실패')
  }

  // 봇이 포함되어 있다면 환영 알림 시스템 메시지 전송
  const { data: botAccounts } = await supabaseAdmin
    .from('accounts')
    .select('display_name')
    .in('id', participantIds)
    .eq('is_ai', true)
    
  if (botAccounts && botAccounts.length > 0) {
    const names = botAccounts.map(b => b.display_name).join(', ')
    const inviterName = user.user_metadata?.display_name || '방장'
    await supabaseAdmin.from('chat_messages').insert({
      room_id: roomId,
      sender_id: null,
      content: `봇 ${names} 님이 방에 참여했습니다. (${inviterName}님의 초대)`
    })
  }

  revalidatePath('/messages')
  return roomId
}

export async function sendGroupMessage(roomId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 방 참가자들 숨김 해제
  await dbClient.from('chat_participants')
    .update({ hidden_at: null })
    .eq('room_id', roomId)

  // 메시지 삽입
  const { error } = await dbClient
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: effectiveUserId,
      content: content.trim()
    })

  if (error) throw new Error('메시지 전송에 실패했습니다.')

  // 그룹방 내의 봇 목록 가져오기 (자동 답장 트리거용)
  const { data: participants } = await dbClient
    .from('chat_participants')
    .select('user_id')
    .eq('room_id', roomId)
    .neq('user_id', effectiveUserId)

  revalidatePath('/messages')
  
  if (participants) {
    const participantIds = participants.map(p => p.user_id)
    const { data: bots } = await supabaseAdmin
      .from('accounts')
      .select('id, display_name, username')
      .in('id', participantIds)
      .eq('is_ai', true)

    if (bots && bots.length > 0) {
      // 멘션 체크 (@표시 이름)
      const mentionedBots = bots.filter(b => content.includes('@' + b.display_name) || content.includes('@' + b.username))
      
      if (mentionedBots.length > 0) {
        // 멘션된 봇이 있다면 걔네들만 리턴
        return { success: true, aiBots: mentionedBots.map(b => b.id) }
      }
      return { success: true, aiBots: bots.map(b => b.id) }
    }
  }

  return { success: true, aiBots: [] }
}

export async function updateRoomName(roomId: string, newName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 권한 확인 (해당 방 참가자인지)
  const { data: participant } = await dbClient
    .from('chat_participants')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', effectiveUserId)
    .single()

  if (!participant) throw new Error('권한이 없습니다.')

  // 방 이름 업데이트
  const { error } = await supabaseAdmin
    .from('chat_rooms')
    .update({ name: newName.trim() || null })
    .eq('id', roomId)

  if (error) throw new Error('방 이름 변경에 실패했습니다.')

  // 시스템 메시지 기록
  const userName = user.user_metadata?.display_name || '사용자'
  await supabaseAdmin.from('chat_messages').insert({
    room_id: roomId,
    sender_id: null,
    content: `${userName} 님이 방 이름을 변경했습니다.`
  })

  revalidatePath('/messages')
}

export async function kickUser(roomId: string, targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 해당 방의 admin_id 확인
  const { data: room } = await dbClient
    .from('chat_rooms')
    .select('admin_id')
    .eq('id', roomId)
    .single()

  if (!room || room.admin_id !== effectiveUserId) {
    throw new Error('강퇴 권한이 없습니다 (방장이 아닙니다).')
  }

  // 타겟 유저 이름 가져오기
  const { data: targetAccount } = await supabaseAdmin
    .from('accounts')
    .select('display_name')
    .eq('id', targetUserId)
    .single()

  const targetName = targetAccount?.display_name || '사용자'

  // 참여자 명단에서 삭제
  await supabaseAdmin
    .from('chat_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)

  // 강퇴당한 유저가 작성한 모든 메시지 일괄 강제 삭제 (하드 딜리트)
  await supabaseAdmin
    .from('chat_messages')
    .delete()
    .eq('room_id', roomId)
    .eq('sender_id', targetUserId)

  // 방에 남은 사람 확인 (인간 유저가 0명이면 방 폭파 삭제)
  const { data: remainingParticipants } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id, accounts!inner(is_ai)')
    .eq('room_id', roomId)

  const humanCount = (remainingParticipants || []).filter((p: any) => p.accounts && (p.accounts.is_ai === false || p.accounts.is_ai === null)).length
  if (!remainingParticipants || remainingParticipants.length === 0 || humanCount === 0) {
    console.log(`🧹 [Ghost Room Explosion] 인간 유저가 0명이 되어 그룹방(${roomId})을 자동 삭제합니다.`)
    await supabaseAdmin.from('chat_rooms').delete().eq('id', roomId)
    revalidatePath('/messages')
    return
  }

  // 시스템 메시지
  const adminName = user.user_metadata?.display_name || '방장'
  await supabaseAdmin.from('chat_messages').insert({
    room_id: roomId,
    sender_id: null,
    content: `${adminName} 님이 ${targetName} 님을 강퇴했습니다.`
  })

  revalidatePath('/messages')
}

export async function deleteMessage(messageId: string, roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { effectiveUserId, isPiloting } = await getPilotInfo(user)
  const dbClient = isPiloting ? supabaseAdmin : supabase

  // 메시지 조회
  const { data: message } = await dbClient
    .from('chat_messages')
    .select('sender_id')
    .eq('id', messageId)
    .single()

  if (!message) throw new Error('메시지를 찾을 수 없습니다.')

  // 권한 확인: 본인 메시지이거나, 현재 유저가 해당 방의 방장이어야 함
  let hasPermission = false
  if (message.sender_id === effectiveUserId) {
    hasPermission = true
  } else {
    const { data: room } = await dbClient
      .from('chat_rooms')
      .select('admin_id')
      .eq('id', roomId)
      .single()
    if (room && room.admin_id === effectiveUserId) {
      hasPermission = true
    }
  }

  if (!hasPermission) {
    throw new Error('삭제 권한이 없습니다.')
  }

  // 메시지 회수(tombstone) 처리
  await supabaseAdmin
    .from('chat_messages')
    .update({ content: '삭제된 메시지입니다.', is_deleted: true })
    .eq('id', messageId)

  revalidatePath('/messages')
}

export async function clearPilotMode() {
  const cookieStore = await cookies()
  cookieStore.delete('active_persona_id')
  revalidatePath('/messages')
}

