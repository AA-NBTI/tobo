'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'

import pkg from '../../package.json'

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
  { id: 'pet_grooming', label: '✂️ 미용 / 목욕' },
  { id: 'clinic', label: '🏥 병원 / 클리닉' },
  { id: 'pet_hotel', label: '🏨 호텔 / 유치원' },
  { id: 'pet_dining', label: '🍽️ 동반 식당/카페' },
  { id: 'pet_pension', label: '🏕️ 동반 펜션' },
]

const CATEGORY_LABEL_MAP: Record<string, string> = {
  pet_grooming: '✂️ 애견미용/목욕',
  clinic: '🏥 동물병원/진료',
  pet_hotel: '🏨 애견호텔/유치원',
  pet_dining: '🍽️ 동반 식당/카페',
  pet_pension: '🏕️ 동반 펜션',
}

export default function ToboMainConsole({ user }: { user?: any }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isPending, startTransition] = useTransition()
  // 카드 클릭 전용 로딩 (Zero LLM — 빠른 응답이므로 별도 상태)
  const [isCardPending, setIsCardPending] = useState(false)
  // 🔒 카드 경로 슬롯 저장소 — tobo-card-action과 공유하는 단일 진실의 원천
  const [currentSlots, setCurrentSlots] = useState<Record<string, any>>({})
  const [lastShownCardType, setLastShownCardType] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitleInput, setEditTitleInput] = useState('')
  const [hotBusinesses, setHotBusinesses] = useState<any[]>([])

  useEffect(() => {
    if (user?.id) fetchSessions()
    fetchHotBusinesses()
  }, [user?.id])

  async function fetchSessions() {
    const { data } = await supabase.from('tobo_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setSessions(data)
  }

  async function fetchHotBusinesses() {
    const { data } = await supabase.from('businesses').select('name, slug, category').eq('is_active', true).limit(2)
    if (data) setHotBusinesses(data)
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

  // ─── [텍스트 경로] /api/tobo-chat — LLM 사용, 능동제안/재방문기억 포함 ───
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
          { id: Date.now().toString(), role: 'assistant', content: '죄송합니다. 잠시 후 다시 말씀해 주시면 바로 이어갈게요.' }
        ])
      }
    })
  }

  // 선택지 값에서 사용자에게 보여줄 친절한 텍스트 추출 함수
  function getDisplayLabel(val: any): string {
    if (!val) return ''
    if (typeof val === 'string') return val
    if (val.label) return val.label
    if (val.region_hint) return `📍 ${val.region_hint}`
    if (val.pet_size) return `🐶 ${val.pet_size}`
    if (val.style) return `✂️ ${val.style}`
    if (val.priority) {
      const pMap: Record<string, string> = {
        price: '💰 가성비 (저렴한 가격)',
        distance: '🚶 가까운 거리 (도보권)',
        rating: '⭐ 높은 평점/전문성',
        speed: '⚡ 빠른 예약/진료',
      }
      return pMap[val.priority] || val.priority
    }
    if (val.target_date) return `🗓️ ${val.target_date}`
    if (val.target_time) return `🕐 ${val.target_time}`
    if (val.category) {
      const cMap: Record<string, string> = {
        pet_grooming: '✂️ 미용/목욕',
        clinic: '🏥 동물병원',
        pet_hotel: '🏨 호텔/유치원',
        pet_dining: '🍽️ 동반 식당/카페',
        pet_pension: '🏕️ 동반 펜션',
        UNSUPPORTED: '💡 다른 서비스 찾기',
      }
      return cMap[val.category] || val.category
    }
    if (val.name) return val.name
    return '선택 완료'
  }

  // ─── [카드 클릭 경로] /api/tobo-card-action — Zero LLM, 즉시 반응 ───
  async function handleCardClick(cardType: string, selectedValue: any, explicitLabel?: string) {
    if (isCardPending) return

    // open_url 속성이 있는 경우(예: 사장님 등록 화면 바로가기)
    // 페이지 이동 대신 현재 대화창에서 바로 사장님 등록 온보딩 시작
    if (selectedValue?.open_url === '/ko/register' || selectedValue?.start_owner_onboarding) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: '🏪 사장님 매장 등록 시작하기' },
      ])
      setIsCardPending(true)
      try {
        const res = await fetch('/api/owner-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 0, message: '', collected: {} }),
        })
        const data = await res.json()
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.reply,
            cards: data.card,
          }
        ])
      } catch (err) {
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: 'assistant', content: '사장님 온보딩 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
        ])
      } finally {
        setIsCardPending(false)
      }
      return
    } else if (selectedValue?.open_url) {
      window.location.href = selectedValue.open_url
      return
    }

    // 다른 서비스 찾기 / UNSUPPORTED / back_to_home 클릭 시 수기 입력창으로 즉시 안내 및 확실한 포커스 보장
    if (
      selectedValue?.category === 'UNSUPPORTED' ||
      selectedValue?.back_to_home ||
      selectedValue?.manual_input
    ) {
      const userBubbleText = explicitLabel || selectedValue?.label || '💡 다른 서비스 직접 입력'
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'user', content: userBubbleText },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '찾으시는 서비스나 매장 조건을 아래 입력창에 편하게 말씀해 주세요! ✍️ 토보가 맞춤으로 찾아드릴게요.',
        }
      ])
      // 화면이 empty-state에서 active-chat으로 전환되는 타이밍을 완벽히 맞추기 위해 2단계 포커스
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
          }
        }, 50)
      })
      return
    }

    setIsCardPending(true)

    // 선택 표시 — 사용자 친절 라벨로 버블 출력 (JSON 코드 노출 방지)
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: explicitLabel || selectedValue?.label || getDisplayLabel(selectedValue),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/tobo-card-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardType,
          selectedValue,
          currentSlots,
          lastShownCardType,
          userId: user?.id || 'anonymous',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')

      // 슬롯 업데이트 (단일 진실의 원천)
      if (data.updatedSlots) setCurrentSlots(data.updatedSlots)
      if (data.card?.type) setLastShownCardType(data.card.type)

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        cards: data.card,
        recommendationList: data.recommendationList,
      }
      setMessages(prev => [...prev, botMsg])

      // 예약 완료 알림
      if (data.reservationId) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `🎉 예약이 완료됐어요! (예약 ID: ${data.reservationId.slice(0, 8)}...)`,
        }])
        // 예약 완료 후 슬롯 초기화
        setCurrentSlots({})
        setLastShownCardType(null)
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: '일시적 오류입니다. 잠시 후 다시 시도해 주세요.' }
      ])
    } finally {
      setIsCardPending(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#1e293b] overflow-hidden font-sans select-none">
      {/* ── 좌측 쿨그레이 사이드바 ── */}
      <aside className="w-64 bg-[#f1f5f9] border-r border-[#e2e8f0] hidden md:flex flex-col justify-between p-3.5 shrink-0">
        <div className="space-y-5">
          {/* toboai 흑백 로고 & 버전 */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
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
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0f172a] text-white rounded-full shadow-xs">
              V{pkg.version}
            </span>
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
              {hotBusinesses.map((shop, idx) => (
                <a
                  key={idx}
                  href={`/shop/${shop.slug}`}
                  target="_blank"
                  className="flex items-center justify-between px-3 py-2 bg-white/70 hover:bg-white rounded-xl border border-[#e2e8f0]/60 text-[#334155] transition"
                >
                  <span className="font-medium truncate">{shop.name}</span>
                  <span className="text-[10px] text-[#64748b] font-semibold">Shop</span>
                </a>
              ))}
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
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#0f172a] text-white rounded-full">
              V{pkg.version}
            </span>
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
            /* 빈 화면: 대화 시작 전 기본 선택 카드(빠른 예약 / 사장님 등록) 및 입력창 제시 */
            <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 px-4 w-full py-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                T
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#0f172a] tracking-tight">
                  원하시는 서비스를 선택해주세요
                </h2>
                <p className="text-xs md:text-sm text-[#64748b] max-w-md leading-relaxed">
                  카드를 클릭하시면 AI 대기 없이 1초 안에 바로 예약이 진행됩니다.
                </p>
              </div>

              {/* ── 1. 빠른 맞춤 예약 카드 (Zero-LLM 카드 클릭 경로) ── */}
              <div className="w-full max-w-xl bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0f172a]" />
                    ⚡ 빠른 맞춤 예약
                  </span>
                  <span className="text-[10px] text-[#475569] bg-[#f1f5f9] px-2 py-0.5 rounded-full font-medium">
                    원클릭 진행
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleCardClick('category_select', { category: 'pet_grooming', label: '✂️ 미용/목욕' }, '✂️ 미용/목욕')}
                    className="p-3 text-xs font-semibold text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✂️</span> <span>미용/목욕</span>
                  </button>
                  <button
                    onClick={() => handleCardClick('category_select', { category: 'clinic', label: '🏥 동물병원' }, '🏥 동물병원')}
                    className="p-3 text-xs font-semibold text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🏥</span> <span>동물병원</span>
                  </button>
                  <button
                    onClick={() => handleCardClick('category_select', { category: 'pet_hotel', label: '🏨 호텔/유치원' }, '🏨 호텔/유치원')}
                    className="p-3 text-xs font-semibold text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🏨</span> <span>호텔/유치원</span>
                  </button>
                  <button
                    onClick={() => handleCardClick('category_select', { category: 'pet_dining', label: '🍽️ 동반 식당/카페' }, '🍽️ 동반 식당/카페')}
                    className="p-3 text-xs font-semibold text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🍽️</span> <span>동반 식당</span>
                  </button>
                  <button
                    onClick={() => handleCardClick('category_select', { category: 'pet_pension', label: '🏕️ 동반 펜션' }, '🏕️ 동반 펜션')}
                    className="p-3 text-xs font-semibold text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🏕️</span> <span>동반 펜션</span>
                  </button>
                  <button
                    onClick={() => handleCardClick('category_select', { category: 'UNSUPPORTED', label: '💡 다른 서비스' }, '💡 다른 서비스')}
                    className="p-3 text-xs font-semibold text-left text-[#64748b] bg-[#f8fafc] hover:bg-[#e2e8f0] border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>💡</span> <span>기타 서비스</span>
                  </button>
                </div>
              </div>

              {/* ── 2. 자유 질문/상담 텍스트 입력창 (메인 중앙) ── */}
              <div className="w-full max-w-xl mt-1">
                <div className="text-[11px] font-semibold text-[#64748b] text-left mb-1.5 flex items-center gap-1">
                  <span>💬 직접 상담/질문하기 (AI 자유 대화)</span>
                </div>
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
                    placeholder="원하시는 조건이나 궁금한 점을 자유롭게 입력하세요... (Shift+Enter 줄바꿈)"
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

              {/* ── 3. 사장님 매장 등록 바로가기 배너 (대화창 아래쪽 배치 & 컬러 제거) ── */}
              <div className="w-full max-w-xl bg-white border border-[#e2e8f0] rounded-2xl p-3.5 text-left flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0f172a]">
                    🏪 사장님이신가요?
                  </div>
                  <p className="text-[11px] text-[#64748b] mt-0.5">
                    간단한 대화로 3분 만에 우리 매장을 등록하고 예약을 받아보세요.
                  </p>
                </div>
                <button
                  onClick={() => handleCardClick('owner_onboarding_guide', { start_owner_onboarding: true }, '🏪 사장님 매장 등록하기')}
                  className="px-3 py-1.5 bg-[#f1f5f9] hover:bg-[#0f172a] text-[#0f172a] hover:text-white border border-[#cbd5e1] rounded-xl text-xs font-semibold transition shrink-0 active:scale-95 cursor-pointer"
                >
                  매장 등록하기 →
                </button>
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
                      {m.cards.options && m.cards.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {m.cards.options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleCardClick(m.cards!.type, opt.value, opt.label)}
                              disabled={isCardPending}
                              className="px-3 py-2 text-xs font-medium text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer disabled:opacity-40"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
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
                              {CATEGORY_LABEL_MAP[shop.category] || shop.category}
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

        {/* ── 하단 입력창 — 카드/텍스트 경로 공용. 대화 시작 후 항상 노출 ── */}
        {messages.length > 0 && (
          <div className="p-3 md:p-6 max-w-3xl w-full mx-auto bg-[#f8fafc]">
            {isCardPending && (
              <div className="text-center mb-2">
                <span className="text-[10px] text-teal-600 font-semibold animate-pulse">⚡ 카드 처리 중...</span>
              </div>
            )}
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
                placeholder="카드를 클릭하거나 직접 입력하세요... (Shift+Enter 줄바꿈)"
                readOnly={isPending || isCardPending}
                className="flex-1 resize-none text-xs text-[#0f172a] bg-transparent focus:outline-none placeholder-[#94a3b8] py-1 max-h-32 overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending || isCardPending}
                className="p-1.5 bg-[#0f172a] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-20 transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-[#64748b]">
                버튼을 누르시면 빠르게 진행되며, 원하시는 내용을 직접 입력하셔도 돼요 😊
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
