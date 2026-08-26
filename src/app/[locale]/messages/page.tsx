import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ChatWindow from '@/components/ChatWindow'
import { setRequestLocale } from 'next-intl/server'
import { cookies } from 'next/headers'
import { isAdmin } from '@/utils/auth'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { deleteConversation } from './actions'
import DeleteConversationButton from '@/components/DeleteConversationButton'
import MessagesClientWrapper from './MessagesClientWrapper'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function MessagesPage({ searchParams, params }: { searchParams: Promise<{ u?: string, group?: string }>, params: Promise<{ locale: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { locale } = await params
    setRequestLocale(locale)

    if (!user) {
      redirect('/login')
    }

    const { u: selectedUserId, group: selectedGroupId } = await searchParams

    // ── 파일럿(탑승) 모드: 관리자가 봇 탑승 중이면 봇 ID로 대화 조회 전환 ──
    const cookieStore = await cookies()
    const pilotBotId = cookieStore.get('active_persona_id')?.value || null
    const hasAdmin = isAdmin(user)

    // 유효한 봇 ID인지 검증 (관리자만 허용)
    let effectiveUserId = user.id
    let isPilotingBot = false
    let pilotBotProfile: any = null

    if (pilotBotId) {
      const { data: botAccount } = await supabaseAdmin
        .from('accounts')
        .select('id, username, display_name, avatar_url, is_ai, claimed_by_user_id')
        .eq('id', pilotBotId)
        .eq('is_ai', true)
        .single()

      if (botAccount) {
        if (hasAdmin || botAccount.claimed_by_user_id === user.id) {
          effectiveUserId = pilotBotId
          isPilotingBot = true
          pilotBotProfile = botAccount
        }
      }
    }

    // 1. 대화 목록 가져오기 (effectiveUserId 기준)
    const { data: convData, error: convError } = await supabaseAdmin.rpc('get_conversations', { p_user_id: effectiveUserId })
    if (convError) {
      console.error('get_conversations RPC error:', convError)
      throw new Error(`대화 목록 DB 조회 실패: ${convError.message} (코드: ${convError.code})`)
    }
    let conversations = convData || []

    // 1-1. 중복된 1:1 방(동일한 other_user_id)이 있을 경우 가장 최신 방 1개만 남기고 제거 (이전 버그로 인한 잔재 정리)
    const seenUsers = new Set()
    conversations = conversations.filter((c: any) => {
      if (c.is_group) return true // 그룹방은 중복 허용
      if (seenUsers.has(c.other_user_id)) return false
      seenUsers.add(c.other_user_id)
      return true
    })

    // 1-2. 유령 그룹방(인간 멤버 0명) 자동 청소 및 대화 목록에서 제외
    const validConversations = []
    for (const c of conversations) {
      if (c.is_group) {
        const { data: pList } = await supabaseAdmin
          .from('chat_participants')
          .select('user_id, accounts!inner(is_ai)')
          .eq('room_id', c.room_id)
        
        const humanCount = (pList || []).filter((p: any) => p.accounts && (p.accounts.is_ai === false || p.accounts.is_ai === null)).length
        if (!pList || pList.length === 0 || humanCount === 0) {
          await supabaseAdmin.from('chat_rooms').delete().eq('id', c.room_id)
          continue
        }
      }
      validConversations.push(c)
    }
    conversations = validConversations

    // 2. 만약 selectedUserId가 있는데 대화 목록에 없다면 (새로운 대화)
    if (selectedUserId && !conversations.find((c: any) => c.other_user_id === selectedUserId)) {
      conversations = [{ other_user_id: selectedUserId, is_group: false, last_message: '', last_created_at: new Date().toISOString(), unread_count: 0 }, ...conversations]
    }

    // 3. 각 대화 상대방의 프로필 정보 가져오기
    const otherUserIds = conversations
      .map((c: any) => c.other_user_id)
      .filter((id: any) => id) // null, undefined 제거

    const { data: profiles } = await supabaseAdmin
      .from('accounts')
      .select('id, username, display_name, avatar_url, is_ai')
      .in('id', otherUserIds.length > 0 ? otherUserIds : ['00000000-0000-0000-0000-000000000000'])

    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p
      return acc
    }, {})

    conversations = conversations.map((c: any) => ({
      ...c,
      profile: profileMap[c.other_user_id]
    })).filter((c: any) => c.is_group || c.profile)

    // 4. 현재 선택된 유저 프로필 (1:1)
    const activeUser = selectedUserId ? (profileMap[selectedUserId] || null) : null

    // 5. 현재 선택된 그룹방 정보
    let activeGroup = null
    if (selectedGroupId) {
      const { data: groupRoom } = await supabaseAdmin
        .from('chat_rooms')
        .select('*')
        .eq('id', selectedGroupId)
        .single()
      if (groupRoom) activeGroup = groupRoom
    }

    return (
      <MessagesClientWrapper 
        conversations={conversations}
        activeUser={activeUser}
        activeGroup={activeGroup}
        effectiveUserId={effectiveUserId}
        isPilotingBot={isPilotingBot}
        pilotBotProfile={pilotBotProfile}
        displayUserId={user.id}
      />
    )
  } catch (e: any) {
    return (
      <div className="p-10 text-red-500 font-bold bg-red-100 rounded-xl m-10">
        <h2>MessagesPage Server Error</h2>
        <p>{e.message || String(e)}</p>
        <pre className="mt-4 text-xs overflow-auto">{e.stack}</pre>
      </div>
    )
  }
}

