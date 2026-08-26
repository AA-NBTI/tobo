'use client'

import { useState, useRef, useEffect, useTransition } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
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
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

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
    if (!textToSend) setInput('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/tobo-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            history: nextHistory
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '오류 발생')

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
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
            }}
            className="w-full flex items-center gap-2 py-2 px-3 bg-white hover:bg-[#ffffff] text-[#0f172a] rounded-xl text-xs font-semibold border border-[#e2e8f0] shadow-sm transition active:scale-98"
          >
            <span className="text-sm font-bold text-[#0f172a]">+</span>
            <span>새 대화 시작</span>
          </button>

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
                <span className="font-medium truncate">몽펫샵 (사하구)</span>
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

        {/* 좌측 최하단: 관리자 링크 */}
        <div className="border-t border-[#e2e8f0] pt-3 text-xs">
          <a
            href="/ko/admin"
            className="flex items-center justify-between px-3 py-2 text-[#475569] hover:text-[#0f172a] rounded-xl hover:bg-white transition"
          >
            <span className="font-medium text-xs">관리자 설정</span>
            <span className="text-[10px] font-bold text-[#64748b] bg-[#e2e8f0] px-1.5 py-0.5 rounded">v1.15</span>
          </a>
        </div>
      </aside>

      {/* ── 중앙/우측 쿨그레이 대화창 영역 ── */}
      <main className="flex-1 flex flex-col justify-between bg-[#f8fafc] overflow-hidden relative">
        {/* 대화 타임라인 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 space-y-6 max-w-3xl w-full mx-auto select-text">
          {messages.length === 0 ? (
            /* 빈 화면 중앙 미니멀 뷰 */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 pt-24 text-[#64748b]">
              <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-xl">
                T
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#0f172a]">
                  무엇을 도와드릴까요?
                </h2>
                <p className="text-xs text-[#64748b] max-w-md leading-relaxed">
                  궁금한 점이나 찾으시는 로컬 매장, 예약에 대해 편하게 대화해 보세요.
                </p>
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

        {/* ── 하단 쿨그레이 무채색 입력창 ── */}
        <div className="p-4 md:p-6 max-w-3xl w-full mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-white border border-[#cbd5e1] focus-within:border-[#0f172a] rounded-2xl px-4 py-2.5 transition"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              disabled={isPending}
              className="flex-1 text-xs text-[#0f172a] bg-transparent focus:outline-none placeholder-[#94a3b8]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="p-1.5 bg-[#0f172a] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-20 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-[#64748b]">
              toboai는 사용자의 대화 맥락을 임베딩하여 최적의 제휴 매장을 연결합니다.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
