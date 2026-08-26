'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendMessage, markAsRead, getMessages } from '@/app/[locale]/messages/actions'
import { toast } from 'react-hot-toast'
import { Link } from '@/i18n/routing'
import { Loader2, Send } from 'lucide-react'
import PostTTSButton from './PostTTSButton'

export default function ChatWindow({ 
  currentUserId, 
  otherUser,
  displayUserId 
}: { 
  currentUserId: string, 
  otherUser: any,
  displayUserId?: string  // 탑승 모드: 실제 관리자 ID (말풍선 좌우 구분용)
}) {
  // 말풍선 표시 기준:
  // - 일반 모드: currentUserId === displayUserId === 실제 유저 ID
  // - 파일럿 모드: currentUserId = 봇ID, displayUserId = 관리자ID
  //   -> 봇이 보낸 메시지(sender_id=봇ID) = 오른쪽(내가 보낸 것)
  //   -> 상대방(aa)이 보낸 메시지 = 왼쪽
  // displayUserId도 포함하는 이유: 관리자가 비파일럿 상태로 보낸 메시지 안전 처리
  const bubbleOwnerId = currentUserId
  const altOwnerId = displayUserId
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const today = new Date()
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    
    const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
    if (isToday) {
      return timeStr
    } else {
      const dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      return `${dateStr} ${timeStr}`
    }
  }

  const fetchMessages = async () => {
    const data = await getMessages(otherUser.id)
    if (data && data.length > 0) {
      setMessages(data)
      setRoomId(data[0].room_id)
      markAsRead(otherUser.id)
    }
  }

  useEffect(() => {
    fetchMessages()

    let channel: any = null
    if (roomId) {
      channel = supabase.channel(`room_${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomId}`
          },
          (payload) => {
            if (payload.new.sender_id === otherUser.id) {
              setMessages(prev => [...prev, payload.new])
              markAsRead(otherUser.id)
            }
          }
        )
        .subscribe()
    }

    // 봇 탑승 상태일 경우 Realtime이 RLS에 막히므로 폴링 적용 (5초)
    let pollInterval: NodeJS.Timeout
    if (currentUserId !== displayUserId) {
      pollInterval = setInterval(fetchMessages, 5000)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [currentUserId, otherUser.id, roomId])

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
      sender_id: currentUserId,
      receiver_id: otherUser.id,
      content: inputText.trim(),
      created_at: new Date().toISOString(),
      is_read: false
    }

    setMessages(prev => [...prev, newMsg])
    setInputText('')
    setIsSending(true)

    try {
      const res = await sendMessage(otherUser.id, newMsg.content)
      // re-fetch to get real ID
      fetchMessages()

      // 봇인 경우 클라이언트에서 응답 대기 (Vercel 타임아웃/강제종료 방지)
      if (res?.isAi) {
        setIsAiTyping(true)
        fetch('/api/ai-reply-dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUserId, botId: otherUser.id, message: newMsg.content, roomId: res.roomId })
        }).then(async (aiRes) => {
          if (!aiRes.ok) {
            const errText = await aiRes.text();
            let errData: any = {};
            try {
              errData = JSON.parse(errText);
            } catch (e) {
              console.error('AI Reply raw error text:', errText);
            }
            console.error('AI Reply failed:', errData);
            toast.error(`봇 응답 실패: ${errData.error || aiRes.statusText}`);
          }
        }).catch((err) => {
          console.error('AI Reply fetch error:', err);
          toast.error('봇 응답 요청 중 오류가 발생했습니다.');
        }).finally(() => {
          setIsAiTyping(false)
        })
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

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] md:h-[calc(100vh-140px)] mb-16 md:mb-0 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b flex items-center gap-3">
        <Link href="/messages" className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shrink-0" title="목록으로">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} className="w-10 h-10 rounded-full object-cover border" alt="" />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">?</div>
        )}
        <div>
          <Link href={`/users/${otherUser.id}`} className="font-bold text-gray-900 hover:underline">
            {otherUser.display_name}
          </Link>
          {otherUser.is_ai && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">AI Bot</span>}
          <div className="text-xs text-gray-500">@{otherUser.username}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === bubbleOwnerId || (altOwnerId && msg.sender_id === altOwnerId)
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start gap-2'}`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border bg-gray-100 flex items-center justify-center">
                  {otherUser?.avatar_url ? (
                    <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">?</span>
                  )}
                </div>
              )}
              <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-[100%] rounded-2xl px-4 py-2.5 text-sm relative group whitespace-pre-wrap ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'}`}>
                  {msg.content}
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <span className="text-[10px] text-gray-400 mb-1">{formatTime(msg.created_at)}</span>
                  <PostTTSButton text={msg.content} senderId={msg.sender_id} variant="icon" />
                </div>
              </div>
            </div>
          )
        })}
        {isAiTyping && (
          <div className="flex justify-start">
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
            placeholder="메시지를 입력하세요... (Shift+Enter 줄바꿈)"
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
    </div>
  )
}
