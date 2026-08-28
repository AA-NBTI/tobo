'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  cards?: {
    type: string
    title: string
    options: Array<{ label: string; value: any }>
  }
  recommendationList?: Array<{
    id: string
    name: string
    category: string
    address?: string
    slug: string
    description?: string
    services?: Array<{ id: string; name: string; price: number; duration_minutes: number }>
    criteriaBadge?: string
  }>
}

const CATEGORIES = [
  { id: 'all', label: '전체 상담' },
  { id: 'beauty', label: '뷰티 / 헤어 / 펫' },
  { id: 'restaurant', label: '맛집 / 식당 / 주점' },
  { id: 'clinic', label: '클리닉 / 상담 / 진료' },
  { id: 'fitness', label: '운동 / 피트니스' },
]

export default function ToboMainConsole({ user }: { user?: any }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitleInput, setEditTitleInput] = useState('')

  useEffect(() => {
    if (user?.id) fetchSessions()
  }, [user?.id])

  async function fetchSessions() {
    const { data } = await supabase.from('tobo_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setSessions(data)
  }

  async function loadSession(sessionId: string) {
    setCurrentSessionId(sessionId)
    const { data } = await supabase.from('tobo_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
    if (data) {
      setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content })))
    } else {
      setMessages([])
    }
  }

  // 세션 제목 수정 저장
  async function saveSessionTitle(sessionId: string) {
    const trimmed = editTitleInput.trim()
    if (!trimmed) {
      setEditingSessionId(null)
      return
    }
    const { error } = await supabase.from('tobo_sessions').update({ title: trimmed }).eq('id', sessionId)
    if (!error) {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmed } : s))
    }
    setEditingSessionId(null)
  }

  // 선택된 세션 일괄 삭제
  async function deleteSelectedSessions() {
    if (selectedSessionIds.length === 0) return
    if (!confirm(`선택한 ${selectedSessionIds.length}개의 대화를 삭제하시겠습니까?`)) return

    const { error } = await supabase.from('tobo_sessions').delete().in('id', selectedSessionIds)
    if (!error) {
      setSessions(prev => prev.filter(s => !selectedSessionIds.includes(s.id)))
      if (currentSessionId && selectedSessionIds.includes(currentSessionId)) {
        setCurrentSessionId(null)
        setMessages([])
      }
      setSelectedSessionIds([])
    }
  }

  function toggleSelectSession(id: string) {
    setSelectedSessionIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  // 자동 포커스 복귀: 전송(isPending) 완료 후 입력창에 포커스를 다시 줍니다.
  useEffect(() => {
    if (!isPending) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isPending])

  // 텍스트에어리어 자동 높이 조절
  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 128)}px` // max-h-32 (128px)
  }

  async function handleSend(textToSend?: string) {
    const messageContent = (textToSend || input).trim()
    if (!messageContent || isPending) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
    }

    const nextHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    if (!textToSend) {
      setInput('')
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }

    const sessionId = currentSessionId

    startTransition(async () => {
      try {
        const res = await fetch('/api/tobo-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            history: nextHistory,
            session_id: sessionId,
            user_id: user?.id
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '오류 발생')

        // 새로 생성된 세션 ID 수신 시 세션 목록 갱신 (ChatGPT/클로드 스타일)
        if (data.session_id && !currentSessionId) {
          setCurrentSessionId(data.session_id)
          const newSessionObj = {
            id: data.session_id,
            title: messageContent.slice(0, 25),
            created_at: new Date().toISOString()
          }
          setSessions(prev => [newSessionObj, ...prev])
        }

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          cards: data.cards,
          recommendationList: data.recommendationList
        }

        setMessages(prev => [...prev, botMsg])
      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: '죄송합니다. 잠시 후 다시 말씀해 주시면 바로 이어갈게요.',
          }
        ])
      }
    })
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#1e293b] overflow-hidden font-sans select-none">
      {/* ── 좌측 쿨그레이 사이드바 ── */}
      <aside className="w-64 bg-[#f1f5f9] border-r border-[#e2e8f0] hidden md:flex flex-col justify-between p-3.5 shrink-0">
        <div className="space-y-5">
          {/* toboai 흑백 로고 */}
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-black text-lg">
              T
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#0f172a] leading-none">
                toboai
              </span>
              <span className="text-[10px] text-[#64748b] font-medium tracking-wide">
                AI 컨시어지
              </span>
            </div>
          </div>

          {/* 새 대화 시작 버튼 */}
          <button
            onClick={() => {
              setMessages([])
              setCurrentSessionId(null)
            }}
            className="w-full flex items-center gap-2 py-2 px-3 bg-white hover:bg-[#ffffff] text-[#0f172a] rounded-xl text-xs font-semibold border border-[#e2e8f0] shadow-sm transition active:scale-98"
          >
            <span className="text-sm font-bold text-[#0f172a]">+</span>
            <span>새 대화 시작</span>
          </button>

          {/* 이전 대화 목록 (체크박스 삭제 및 제목 변경 기능 포함) */}
          {sessions.length > 0 && (
            <div className="mt-4 flex-1 overflow-y-auto max-h-48 scrollbar-hide space-y-1">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                  이전 대화 ({sessions.length})
                </span>
                {selectedSessionIds.length > 0 && (
                  <button
                    onClick={deleteSelectedSessions}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold px-1.5 py-0.5 bg-red-50 rounded border border-red-200 transition cursor-pointer"
                  >
                    선택 삭제 ({selectedSessionIds.length})
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {sessions.map(sess => (
                  <div
                    key={sess.id}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition ${
                      currentSessionId === sess.id
                        ? 'bg-[#e2e8f0] text-[#0f172a]'
                        : 'text-[#475569] hover:bg-[#e2e8f0]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(sess.id)}
                        onChange={() => toggleSelectSession(sess.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#0f172a] focus:ring-0 cursor-pointer shrink-0"
                      />
                      {editingSessionId === sess.id ? (
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSessionTitle(sess.id)
                            if (e.key === 'Escape') setEditingSessionId(null)
                          }}
                          onBlur={() => saveSessionTitle(sess.id)}
                          autoFocus
                          className="w-full bg-white border border-[#cbd5e1] rounded px-1.5 py-0.5 text-xs text-[#0f172a] focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => loadSession(sess.id)}
                          className="flex-1 text-left truncate font-medium cursor-pointer"
                          title={sess.title || '새 대화'}
                        >
                          {sess.title || '새 대화'}
                        </button>
                      )}
                    </div>

                    {editingSessionId !== sess.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingSessionId(sess.id)
                          setEditTitleInput(sess.title || '')
                        }}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-[#64748b] hover:text-[#0f172a] ml-1 px-1 py-0.5 rounded hover:bg-white transition"
                        title="제목 변경"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리 퀵 메뉴 */}
          <div>
            <div className="text-[11px] font-semibold text-[#64748b] px-2 mb-1.5 uppercase tracking-wider">
              카테고리
            </div>
            <div className="space-y-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    handleSend(`${cat.label} 분야 상담하고 싶어`)
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-medium transition text-left ${
                    selectedCategory === cat.id
                      ? 'bg-white text-[#0f172a] shadow-sm border border-[#e2e8f0]'
                      : 'text-[#475569] hover:bg-[#e2e8f0]/60'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 등록 매장 바로가기 */}
          <div>
            <div className="text-[11px] font-semibold text-[#64748b] px-2 mb-1.5 uppercase tracking-wider">
              등록 매장 바로가기
            </div>
            <div className="space-y-1 text-xs">
              <a
                href="/shop/몽펫샵-mt9qp7y1"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 bg-white/70 hover:bg-white rounded-xl border border-[#e2e8f0]/60 text-[#334155] transition"
              >
                <span className="font-medium truncate">몽펫샵 (등록매장)</span>
                <span className="text-[10px] text-[#64748b] font-semibold">Shop</span>
              </a>
              <a
                href="/shop/머라카노-mt9r4fwr"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 bg-white/70 hover:bg-white rounded-xl border border-[#e2e8f0]/60 text-[#334155] transition"
              >
                <span className="font-medium truncate">머라카노 (부산)</span>
                <span className="text-[10px] text-[#64748b] font-semibold">Shop</span>
              </a>
            </div>
          </div>
        </div>

        {/* 좌측 최하단: 관리자 설정 및 로그인 버튼 */}
        <div className="border-t border-[#e2e8f0] pt-3 text-xs space-y-2">
          {!user ? (
            <a
              href="/ko/login"
              className="w-full flex items-center justify-center px-3 py-2 text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition font-medium shadow-sm"
            >
              로그인 후 대화 저장하기
            </a>
          ) : (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.reload()
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[#475569] bg-[#e2e8f0]/40 hover:bg-[#e2e8f0] rounded-lg transition border border-[#e2e8f0]/60 active:scale-98"
              title="로그아웃"
            >
              <span className="text-[10px] font-semibold truncate flex-1 text-left">
                {user.email || '회원 인증됨'}
              </span>
              <span className="text-[10px] text-[#64748b] ml-2">로그아웃</span>
            </button>
          )}
          <a
            href="/ko/admin"
            className="w-full flex items-center justify-between px-3 py-2 text-[#475569] hover:text-[#0f172a] rounded-xl hover:bg-white transition border border-transparent hover:border-[#e2e8f0] shadow-2xs font-medium"
          >
            <span>⚙️ 관리자 설정</span>
            <span className="text-[11px] text-[#94a3b8]">→</span>
          </a>
        </div>
      </aside>

      {/* ── 중앙/우측 쿨그레이 대화창 영역 ── */}
      <main className="flex-1 flex flex-col justify-between bg-[#f8fafc] overflow-hidden relative h-full">
        {/* 모바일 상단 미니 헤더 (로고 및 사이드바 토글) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#f1f5f9] border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0f172a] text-white flex items-center justify-center font-black text-xs">
              T
            </div>
            <span className="font-bold text-sm text-[#0f172a]">toboai</span>
          </div>
          <button
            onClick={() => {
              setMessages([])
              setCurrentSessionId(null)
            }}
            className="text-xs font-semibold text-[#0f172a] px-2.5 py-1 bg-white rounded-lg border border-[#e2e8f0]"
          >
            + 새 대화
          </button>
        </div>

        {/* 대화 타임라인 및 클로드 스타일 중앙 뷰 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 space-y-6 max-w-3xl w-full mx-auto select-text flex flex-col">
          {messages.length === 0 ? (
            /* 빈 화면 중앙 클로드 스타일 뷰 (타이틀 바로 아래 입력창 배치) */
            <div className="my-auto flex flex-col items-center justify-center text-center space-y-5 px-4 w-full">
              <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                T
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#0f172a] tracking-tight">
                  예약을 도와드릴까요?
                </h2>
                <p className="text-xs md:text-sm text-[#64748b] max-w-md leading-relaxed">
                  궁금한 점이나 찾으시는 로컬 매장, 예약에 대해 편하게 대화해 보세요.
                </p>
              </div>

              {/* 중앙 대화 입력창 (메시지 없을 때 클로드처럼 중앙에 밀착) */}
              <div className="w-full max-w-xl mt-2">
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex items-center gap-2 bg-white border border-[#cbd5e1] focus-within:border-[#0f172a] rounded-2xl px-4 py-3 shadow-sm transition"
                >
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value)
                      adjustTextareaHeight(e.target)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
                    readOnly={isPending}
                    className="flex-1 resize-none text-xs md:text-sm text-[#0f172a] bg-transparent focus:outline-none placeholder-[#94a3b8] py-1 max-h-32 overflow-y-auto"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isPending}
                    className="p-2 bg-[#0f172a] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-20 transition shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex flex-col space-y-2">
                {/* 발신자 라벨 */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    m.role === 'user' ? 'bg-[#cbd5e1] text-[#0f172a]' : 'bg-[#0f172a] text-white'
                  }`}>
                    {m.role === 'user' ? 'U' : 'T'}
                  </div>
                  <span className="text-xs font-semibold text-[#64748b]">
                    {m.role === 'user' ? 'User' : 'Tobo'}
                  </span>
                </div>

                {/* 본문 텍스트 (순수 자연스러운 대화) */}
                <div className="text-xs text-[#1e293b] leading-relaxed pl-7 whitespace-pre-wrap font-normal">
                  {m.content}
                </div>

                {/* ── 1. 상황별 선택 카드 (버튼 클릭으로 즉시 답변 진행) ── */}
                {m.cards && (
                  <div className="pl-7 pt-2">
                    <div className="p-3.5 bg-white border border-[#e2e8f0] rounded-2xl shadow-xs space-y-2.5 max-w-lg">
                      <div className="text-xs font-semibold text-[#0f172a] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f172a]" />
                        {m.cards.title}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {m.cards.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(opt.label)}
                            className="px-3 py-2 text-xs font-medium text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 2. 매칭된 매장 및 실시간 예약 카드 ── */}
                {m.recommendationList && m.recommendationList.length > 0 && (
                  <div className="pl-7 pt-2 space-y-2 max-w-lg">
                    <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                      추천 매장 & 예약
                    </div>
                    {m.recommendationList.map((shop) => (
                      <div
                        key={shop.id}
                        className="p-4 bg-white border border-[#e2e8f0] rounded-2xl shadow-xs hover:border-[#cbd5e1] transition flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {shop.criteriaBadge && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md">
                                  [{shop.criteriaBadge}]
                                </span>
                              )}
                              <h3 className="text-sm font-bold text-[#0f172a]">{shop.name}</h3>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#f1f5f9] text-[#475569] rounded-md">
                              {shop.category === 'pet_grooming' ? '애견미용' : shop.category}
                            </span>
                          </div>
                          {shop.address && (
                            <p className="text-[11px] text-[#64748b] mt-1">{shop.address}</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between">
                          <span className="text-xs text-[#64748b]">
                            {shop.services && shop.services.length > 0
                              ? `${shop.services[0].name} (${shop.services[0].price === 0 ? '무료' : `${shop.services[0].price.toLocaleString()}원`})`
                              : '전문 상담 가능'}
                          </span>
                          <a
                            href={`/shop/${shop.slug}`}
                            target="_blank"
                            className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold rounded-xl transition shadow-xs active:scale-98"
                          >
                            예약하기 →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {/* ── 봇 타이핑 애니메이션 (점 3개 바운스 효과) ── */}
          {isPending && (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-[#0f172a] text-white">
                  T
                </div>
                <span className="text-xs font-semibold text-[#64748b]">
                  Tobo
                </span>
              </div>
              <div className="pl-7">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e2e8f0] rounded-xl shadow-xs">
                  <span className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 입력창 (대화가 시작되었을 때만 하단에 렌더링) ── */}
        {messages.length > 0 && (
          <div className="p-3 md:p-6 max-w-3xl w-full mx-auto bg-[#f8fafc]">
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2 bg-white border border-[#cbd5e1] focus-within:border-[#0f172a] rounded-2xl px-4 py-2.5 shadow-2xs transition"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  adjustTextareaHeight(e.target)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
                readOnly={isPending}
                className="flex-1 resize-none text-xs text-[#0f172a] bg-transparent focus:outline-none placeholder-[#94a3b8] py-1 max-h-32 overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                className="p-1.5 bg-[#0f172a] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-20 transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-[#64748b]">
                toboai는 사용자의 대화 맥락을 임베딩하여 최적의 제휴 매장을 연결합니다.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
