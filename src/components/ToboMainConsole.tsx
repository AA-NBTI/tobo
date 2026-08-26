'use client'

import { useState, useRef, useEffect, useTransition } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  cards?: any
  recommendations?: any[]
}

const CATEGORIES = [
  { id: 'all', label: '전체 상담', icon: '✨' },
  { id: 'beauty', label: '뷰티 / 헤어 / 펫', icon: '💇' },
  { id: 'restaurant', label: '맛집 / 식당 / 주점', icon: '🍽' },
  { id: 'clinic', label: '클리닉 / 상담 / 진료', icon: '🏥' },
  { id: 'fitness', label: '운동 / 피트니스 / 레저', icon: '💪' },
]

export default function ToboMainConsole({ user }: { user?: any }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [step, setStep] = useState(1)
  const [context, setContext] = useState<any>({})
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
            step,
            context,
            history: nextHistory
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '오류 발생')

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          cards: data.cards,
          recommendations: data.recommendationList,
        }

        setMessages(prev => [...prev, botMsg])
        setStep(data.step || step + 1)
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

  function handleOptionClick(option: { label: string; value: any }) {
    setContext((prev: any) => ({ ...prev, ...option.value }))
    handleSend(option.label)
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#1e293b] overflow-hidden font-sans select-none">
      {/* ── 좌측 쿨그레이 사이드바 (#f1f5f9 / #e2e8f0) ── */}
      <aside className="w-64 bg-[#f1f5f9] border-r border-[#e2e8f0] hidden md:flex flex-col justify-between p-3.5 shrink-0">
        <div className="space-y-5">
          {/* toboai 로고 (두꺼운 T 심볼 + toboai 텍스트) */}
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-black text-lg shadow-sm">
              T
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-[#0f172a] leading-none">
                tobo<span className="text-[#3b82f6]">ai</span>
              </span>
              <span className="text-[10px] text-[#64748b] font-medium tracking-wide">
                AI 예약·상담 컨시어지
              </span>
            </div>
          </div>

          {/* 새 대화 시작 버튼 */}
          <button
            onClick={() => {
              setMessages([])
              setStep(1)
              setContext({})
            }}
            className="w-full flex items-center gap-2 py-2.5 px-3.5 bg-white hover:bg-[#ffffff] text-[#0f172a] rounded-xl text-xs font-bold border border-[#e2e8f0] shadow-sm transition active:scale-98"
          >
            <span className="text-sm font-bold text-[#3b82f6]">+</span>
            <span>새 예약·상담 시작</span>
          </button>

          {/* 카테고리 퀵 메뉴 */}
          <div>
            <div className="text-[11px] font-bold text-[#64748b] px-2 mb-2 uppercase tracking-wider">
              맞춤 카테고리
            </div>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setContext((prev: any) => ({ ...prev, category: cat.id }))
                    handleSend(`${cat.label} 쪽으로 추천 및 예약 상담해줘`)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                    selectedCategory === cat.id
                      ? 'bg-white text-[#0f172a] shadow-sm border border-[#e2e8f0]'
                      : 'text-[#475569] hover:bg-[#e2e8f0]/60'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 등록 매장 봇 1:1 상담 */}
          <div>
            <div className="text-[11px] font-bold text-[#64748b] px-2 mb-2 uppercase tracking-wider">
              전담 매장 봇 직결
            </div>
            <div className="space-y-1 text-xs">
              <a
                href="/shop/몽펫샵-mt9qp7y1"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 bg-white/70 hover:bg-white rounded-xl border border-[#e2e8f0]/60 text-[#334155] transition shadow-2xs"
              >
                <span className="font-semibold truncate">🐶 몽펫샵 (사하구)</span>
                <span className="text-[10px] text-[#3b82f6] font-bold">예약 봇</span>
              </a>
              <a
                href="/shop/머라카노-mt9r4fwr"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 bg-white/70 hover:bg-white rounded-xl border border-[#e2e8f0]/60 text-[#334155] transition shadow-2xs"
              >
                <span className="font-semibold truncate">🍗 머라카노 (부산)</span>
                <span className="text-[10px] text-[#3b82f6] font-bold">예약 봇</span>
              </a>
            </div>
          </div>
        </div>

        {/* 좌측 최하단: 관리자 설정 및 프롬프트 관리 링크 */}
        <div className="border-t border-[#e2e8f0] pt-3 space-y-1 text-xs">
          <a
            href="/ko/admin"
            className="flex items-center justify-between px-3 py-2 text-[#475569] hover:text-[#0f172a] rounded-xl hover:bg-white transition"
          >
            <div className="flex items-center gap-2">
              <span>⚙️</span>
              <span className="font-semibold text-xs">관리자 & 프롬프트 설정</span>
            </div>
            <span className="text-[10px] font-bold text-[#64748b] bg-[#e2e8f0] px-1.5 py-0.5 rounded">v1.12</span>
          </a>
        </div>
      </aside>

      {/* ── 중앙/우측 쿨그레이 밝은 대화창 영역 (#f8fafc) ── */}
      <main className="flex-1 flex flex-col justify-between bg-[#f8fafc] overflow-hidden relative">
        {/* 대화 타임라인 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 space-y-6 max-w-3xl w-full mx-auto select-text">
          {messages.length === 0 ? (
            /* 빈 화면일 때 toboai 중앙 환영 뷰 */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 pt-20 text-[#64748b]">
              <div className="w-14 h-14 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center font-black text-2xl shadow-md">
                T
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">
                  무엇을 찾아드릴까요?
                </h2>
                <p className="text-xs text-[#64748b] max-w-md leading-relaxed">
                  지역, 시간, 업종 또는 원하시는 분위기를 자유롭게 말씀해 주시면 실패 없는 매장과 예약 상담을 이끌어 드립니다.
                </p>
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex flex-col space-y-2">
                {/* 발신자 라벨 */}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    m.role === 'user' ? 'bg-[#cbd5e1] text-[#0f172a]' : 'bg-[#0f172a] text-white'
                  }`}>
                    {m.role === 'user' ? 'U' : 'T'}
                  </div>
                  <span className="text-xs font-bold text-[#475569]">
                    {m.role === 'user' ? '고객님' : 'toboai 컨시어지'}
                  </span>
                </div>

                {/* 본문 텍스트 (자연스러운 티키타카) */}
                <div className="text-xs text-[#334155] leading-relaxed pl-8 whitespace-pre-wrap font-medium">
                  {m.content}
                </div>

                {/* 질문 선택지 퀵 카드 (쿨그레이 세련된 칩 스타일) */}
                {m.cards && (
                  <div className="ml-8 mt-2 bg-white border border-[#e2e8f0] rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="text-xs font-bold text-[#0f172a]">
                      {m.cards.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.cards.options?.map((opt: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(opt)}
                          disabled={isPending}
                          className="px-3.5 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] text-xs font-semibold rounded-xl border border-[#cbd5e1]/60 transition disabled:opacity-40 active:scale-95 shadow-2xs"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 실시간 맞춤 매장 큐레이션 베스트 리스트 */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div className="ml-8 mt-3 space-y-2.5">
                    <div className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                      <span>🏆</span>
                      <span>고객님 맞춤 실시간 큐레이션</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {m.recommendations.map(biz => (
                        <div
                          key={biz.id}
                          className="bg-white border border-[#e2e8f0] hover:border-[#3b82f6] rounded-2xl p-4 shadow-sm transition"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] text-[#3b82f6] font-bold bg-[#eff6ff] px-2 py-0.5 rounded-md border border-[#dbeafe]">
                                {biz.category}
                              </span>
                              <h4 className="font-bold text-sm text-[#0f172a] mt-1">{biz.name}</h4>
                              <p className="text-[11px] text-[#64748b] mt-0.5">📍 {biz.address}</p>
                            </div>
                            <a
                              href={`/shop/${encodeURIComponent(biz.slug || biz.id)}`}
                              target="_blank"
                              className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                              1:1 예약 봇 →
                            </a>
                          </div>
                          <p className="text-xs text-[#475569] mt-2.5 bg-[#f8fafc] rounded-xl p-2.5 leading-relaxed font-medium">
                            💡 {biz.matchReason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-[#64748b] pl-8 font-medium">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse"></div>
              <span>토보가 분석하여 최적의 추천안을 준비 중입니다...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 쿨그레이 입력창 ── */}
        <div className="p-4 md:p-6 max-w-3xl w-full mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-white border border-[#cbd5e1] focus-within:border-[#0f172a] rounded-2xl px-4 py-2.5 transition shadow-sm"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="예: 부산 사하구 쪽 친구랑 생맥주 한잔할 옛날통닭 맛집 찾아줘"
              disabled={isPending}
              className="flex-1 text-xs text-[#0f172a] bg-transparent focus:outline-none placeholder-[#94a3b8] font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="p-2 bg-[#0f172a] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-30 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-[#64748b]">
              toboai는 대화를 이끌며 고객님의 취향에 가장 부합하는 매장 봇을 연결합니다.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
