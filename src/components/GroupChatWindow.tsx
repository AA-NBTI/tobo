'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendGroupMessage, inviteToGroupChat, updateRoomName, kickUser, deleteMessage } from '@/app/[locale]/messages/actions'
import { toast } from 'react-hot-toast'
import { Link } from '@/i18n/routing'
import { UserPlus, X, Edit2, Check, Trash2, UserMinus } from 'lucide-react'

export default function GroupChatWindow({ 
  currentUserId, 
  room
}: { 
  currentUserId: string, 
  room: any
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [participants, setParticipants] = useState<Record<string, any>>({})
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [availableUsersToInvite, setAvailableUsersToInvite] = useState<any[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isInviting, setIsInviting] = useState(false)
  const [localRoomName, setLocalRoomName] = useState(room.name || '그룹 채팅방')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameInput, setEditNameInput] = useState('')

  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const today = new Date()
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    
    const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
    if (isToday) return timeStr
    const dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    return `${dateStr} ${timeStr}`
  }

  const fetchMessagesAndParticipants = async () => {
    // 1. 참여자 정보 가져오기
    const { data: partData } = await supabase
      .from('chat_participants')
      .select('user_id, accounts(id, display_name, avatar_url, username, is_ai)')
      .eq('room_id', room.id)

    const pMap: any = {}
    if (partData) {
      partData.forEach((p: any) => {
        pMap[p.user_id] = p.accounts
      })
      setParticipants(pMap)
    }

    // 2. 메시지 가져오기
    const { data: msgData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })

    if (msgData) setMessages(msgData)

    // 3. 읽음 처리
    await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() })
      .eq('room_id', room.id).eq('user_id', currentUserId)
  }

  useEffect(() => {
    fetchMessagesAndParticipants()

    if (room?.id) {
      supabase.from('accounts').select('id, display_name, username, avatar_url, is_ai').neq('id', currentUserId).then(({ data }) => {
        if (data) setAvailableUsersToInvite(data)
      })
    }

    const channel = supabase.channel(`room_${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.new.sender_id !== currentUserId) {
            setMessages(prev => [...prev, payload.new])
            supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() })
              .eq('room_id', room.id).eq('user_id', currentUserId)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id, currentUserId])

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAiTyping])

  const handleSend = async (e: React.FormEvent) => {
    e?.preventDefault()
    if (!inputText.trim() || isSending) return

    const tempId = Date.now().toString()
    const newMsg = {
      id: tempId,
      room_id: room.id,
      sender_id: currentUserId,
      content: inputText.trim(),
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, newMsg])
    setInputText('')
    setIsSending(true)

    try {
      const res = await sendGroupMessage(room.id, newMsg.content)
      
      // 봇이 있으면 AI 트리거
      if (res.success && res.aiBots && res.aiBots.length > 0) {
        setIsAiTyping(true)
        
        // 봇 병렬 호출 (지연 병렬 처리로 속도 개선 - Phase 3)
        const triggerBots = async () => {
          const shuffledBots = [...res.aiBots].sort(() => Math.random() - 0.5)
          
          await Promise.all(shuffledBots.map(async (botId, index) => {
            // 각 봇이 완전히 동시에 응답하지 않고 약간씩 시간차를 두고 고민하도록 (자연스러운 다중 발화 허용)
            await new Promise(r => setTimeout(r, index * 500))
            try {
              await fetch('/api/ai-reply-group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: currentUserId, botId, message: newMsg.content, roomId: room.id })
              })
            } catch (e) {
              console.error(e)
            }
          }))
          setIsAiTyping(false)
        }
        
        triggerBots()
      }
    } catch (e: any) {
      toast.error('메시지 전송 실패')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as any)
    }
  }

  const handleInvite = async () => {
    if (selectedUserIds.length === 0) return
    setIsInviting(true)
    try {
      await inviteToGroupChat(room.id, selectedUserIds)
      toast.success('초대 완료!')
      
      const invitedBots = availableUsersToInvite.filter(u => u.is_ai && selectedUserIds.includes(u.id)).map(u => u.id)
      
      setShowParticipantsModal(false)
      setSelectedUserIds([])
      await fetchMessagesAndParticipants()

      // 봇이 초대된 경우 즉시 첫인사 유도 (Phase 2)
      if (invitedBots.length > 0) {
        setIsAiTyping(true)
        await Promise.all(invitedBots.map(async botId => {
          try {
            await fetch('/api/ai-reply-group', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: currentUserId, botId, message: '[SYSTEM] 방금 이 채팅방에 초대되었습니다. 인사말을 남겨주세요!', roomId: room.id, forceReply: true })
            })
          } catch (e) {
            console.error(e)
          }
        }))
        setIsAiTyping(false)
      }
    } catch (e: any) {
      toast.error(e.message || '초대에 실패했습니다.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleSaveRoomName = async () => {
    if (editNameInput.trim() === localRoomName) {
      setIsEditingName(false)
      return
    }
    try {
      await updateRoomName(room.id, editNameInput)
      setLocalRoomName(editNameInput.trim())
      setIsEditingName(false)
      toast.success('방 이름이 변경되었습니다.')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleKickUser = async (targetId: string) => {
    if (!window.confirm('정말 내보내시겠습니까?')) return
    try {
      await kickUser(room.id, targetId)
      toast.success('강퇴 처리되었습니다.')
      await fetchMessagesAndParticipants()
    } catch (e: any) {
      toast.error(e.message || '강퇴 실패')
    }
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('메시지를 삭제하시겠습니까?')) return
    try {
      await deleteMessage(msgId, room.id)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: '삭제된 메시지입니다.', is_deleted: true } : m))
      toast.success('삭제되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '삭제 실패')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] md:h-[calc(100vh-140px)] mb-16 md:mb-0 bg-white rounded-xl shadow-sm border border-gray-200 relative">
      <div 
        className="p-4 border-b flex items-center justify-between bg-blue-50/30 cursor-pointer hover:bg-blue-50/60 transition"
        onClick={() => setShowParticipantsModal(true)}
      >
        <div className="flex items-center gap-3">
          <Link href="/messages" className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shrink-0" title="목록으로" onClick={(e) => e.stopPropagation()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">
            {Object.keys(participants).length}명
          </div>
          <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNameInput}
                  onChange={e => setEditNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveRoomName()}
                  className="font-bold text-gray-900 border-b border-blue-500 outline-none bg-transparent px-1 max-w-[150px]"
                  autoFocus
                />
                <button onClick={handleSaveRoomName} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16}/></button>
                <button onClick={() => setIsEditingName(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={16}/></button>
              </div>
            ) : (
              <div className="font-bold text-gray-900 flex items-center gap-1 group">
                <span className="truncate max-w-[200px]">{localRoomName}</span>
                <button 
                  onClick={() => {
                    setEditNameInput(localRoomName)
                    setIsEditingName(true)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <div className="text-xs text-gray-500 line-clamp-1 max-w-[200px] md:max-w-md">
              참여자: {Object.values(participants).map((p: any) => p.display_name).join(', ')}
            </div>
          </div>
        </div>
        <button 
          className="text-blue-600 p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition"
          onClick={(e) => { e.stopPropagation(); setShowParticipantsModal(true) }}
        >
          <UserPlus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => {
          if (!msg.sender_id || msg.sender_id === '00000000-0000-0000-0000-000000000000') {
            return (
              <div key={msg.id || idx} className="flex justify-center my-4">
                <div className="bg-gray-200/70 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">
                  {msg.content}
                </div>
              </div>
            )
          }

          const isMine = msg.sender_id === currentUserId
          const sender = participants[msg.sender_id]
          const showAvatar = !isMine && (idx === 0 || messages[idx-1].sender_id !== msg.sender_id || !messages[idx-1].sender_id || messages[idx-1].sender_id === '00000000-0000-0000-0000-000000000000')

          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start gap-2'}`}>
              {!isMine && (
                <div className="w-8 shrink-0 flex flex-col items-center">
                  {showAvatar && (
                    <div className="w-8 h-8 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center mb-1">
                      {sender?.avatar_url ? (
                        <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">?</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="max-w-[75%] group">
                {showAvatar && (
                  <div className="text-xs text-gray-500 mb-1 ml-1 flex items-center gap-1">
                    {sender?.display_name || '알 수 없음'}
                    {sender?.is_ai && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded-full">AI</span>}
                  </div>
                )}
                <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm relative whitespace-pre-wrap ${msg.is_deleted ? 'bg-gray-100 text-gray-400 border border-gray-200 shadow-none italic' : isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'}`}>
                    {msg.content}
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <span className="text-[10px] text-gray-400 mb-1">{formatTime(msg.created_at)}</span>
                  </div>
                  {!msg.is_deleted && (isMine || room.admin_id === currentUserId) && (
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title="메시지 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {isAiTyping && (
          <div className="flex justify-start gap-2 ml-10">
            <div className="max-w-[70%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-200 text-gray-500 rounded-bl-none shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t rounded-b-xl">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <textarea 
            value={inputText}
            onChange={e => {
              setInputText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              scrollToBottom(false)
            }}
            onKeyDown={handleKeyDown}
            placeholder="그룹에 메시지를 입력하세요..."
            className="flex-1 bg-gray-100 border-none px-4 py-2.5 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-y-auto"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isSending}
            className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>

      {showParticipantsModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80%] flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">대화방 참여자 ({Object.keys(participants).length})</h2>
              <button onClick={() => setShowParticipantsModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-2">현재 참여 중</h3>
                <div className="space-y-2">
                  {Object.values(participants).sort((a: any, b: any) => {
                    if (a.id === room.admin_id) return -1
                    if (b.id === room.admin_id) return 1
                    return 0
                  }).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
                      <div className="flex items-center gap-3">
                        {p.avatar_url ? <img src={p.avatar_url} className="w-8 h-8 rounded-full border" alt=""/> : <div className="w-8 h-8 bg-gray-200 rounded-full"/>}
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm">{p.display_name}</span>
                          {room.admin_id === p.id && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200">방장</span>}
                          {p.is_ai && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">AI</span>}
                        </div>
                      </div>
                      {room.admin_id === currentUserId && p.id !== currentUserId && (
                        <button 
                          onClick={() => handleKickUser(p.id)}
                          className="text-red-500 bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 transition"
                          title="내보내기"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-xs font-bold text-gray-500 mb-2">대화 상대 추가 초대</h3>
                <div className="space-y-2">
                  {availableUsersToInvite
                    .filter(u => !participants[u.id])
                    .map(user => (
                    <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-blue-600 focus:ring-blue-500"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUserIds([...selectedUserIds, user.id])
                          else setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                        }}
                      />
                      {user.avatar_url ? <img src={user.avatar_url} className="w-8 h-8 rounded-full border" alt=""/> : <div className="w-8 h-8 bg-gray-200 rounded-full"/>}
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1">
                          {user.display_name}
                          {user.is_ai && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">AI</span>}
                        </div>
                        <div className="text-xs text-gray-400">@{user.username}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2 rounded-b-xl">
              <button 
                onClick={() => setShowParticipantsModal(false)}
                className="px-4 py-2 text-sm font-medium bg-white border rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
              <button 
                onClick={handleInvite}
                disabled={selectedUserIds.length === 0 || isInviting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isInviting ? '초대 중...' : `${selectedUserIds.length}명 초대하기`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
