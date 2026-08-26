'use client'

import { useState, useRef, useEffect, useTransition } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  cards?: any
  recommendations?: any[]
  time: string
}

const CATEGORIES = [
  { id: 'all', label: '전체 상담', icon: '✨' },
  { id: 'beauty', label: '뷰티/헤어/펫', icon: '💇' },
  { id: 'restaurant', label: '맛집/식당', icon: '🍽' },
  { id: 'clinic', label: '클리닉/상담', icon: '🏥' },
  { id: 'fitness', label: '운동/피트니스', icon: '💪' },
]

export default function ToboMainConsole({ user }: { user?: any }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '반갑습니다! 저는 실패 없는 맞춤 예약과 실시간 상담을 이끌어 드리는 AI 컨시어지 토보(Tobo)입니다.\n\n어느 지역에서 어떤 매장이나 서비스를 찾고 계신가요? 편하게 말씀해 주세요.',
      time: '지금'
    }
  ])
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

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
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        setMessages(prev => [...prev, botMsg])
        setStep(data.step || step + 1)
      } catch (err: any) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: '죄송합니다. 일시적인 연결 오류가 발생했습니다. 다시 말씀해 주세요.',
            time: '방금'
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
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden font-sans">
      {/* ── 좌측 미니멀 사이드바 (구글/클로드 스타일) ── */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          {/* 새 상담 시작 버튼 */}
          <button
            onClick={() => {
              setMessages([
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: '새로운 상담을 시작합니다. 어떤 서비스를 도와드릴까요?',
                  time: '지금'
                }
              ])
              setStep(1)
              setContext({})
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <span>➕</span>
            <span>새 예약·상담 시작</span>
          </button>

          {/* 카테고리 퀵 메뉴 */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 px-2 mb-2 uppercase tracking-wider">
              카테고리 탐색
            </div>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    handleSend(`${cat.label} 관련해서 추천 및 예약 상담해줘`)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 주요 제휴 샵 퀵 매칭 */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 px-2 mb-2 uppercase tracking-wider">
              인기 등록 매장
            </div>
            <div className="space-y-1 text-xs">
              <a
                href="/shop/몽펫샵-mt9qp7y1"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <span>🐶 몽펫샵 (사하구)</span>
                <span className="text-[10px] text-indigo-600">예약</span>
              </a>
              <a
                href="/shop/머라카노-mt9r4fwr"
                target="_blank"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <span>🍽 머라카노 (부산)</span>
                <span className="text-[10px] text-indigo-600">예약</span>
              </a>
            </div>
          </div>
        </div>

        {/* 하단 관리자 및 프로필 링크 */}
        <div className="border-t border-gray-100 pt-3 space-y-1 text-xs">
          <a
            href="/ko/admin"
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
          >
            <span>⚙️</span>
            <span>관리자 대시보드</span>
          </a>
        </div>
      </aside>

      {/* ── 중앙/우측 대화창 (능동형 인터뷰 및 3초 카드 렌더링) ── */}
      <main className="flex-1 flex flex-col justify-between bg-white md:bg-gray-50/50 overflow-hidden relative">
        {/* 대화 메시지 타임라인 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-3xl w-full mx-auto">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* 발신자 라벨 */}
              <span className="text-[11px] text-gray-400 mb-1 px-1">
                {m.role === 'user' ? '나' : '👑 토보 (Tobo Concierge)'}
              </span>

              {/* 말풍선 */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                }`}
              >
                {m.content}
              </div>

              {/* 능동형 인터랙티브 선택지 카드 */}
              {m.cards && (
                <div className="mt-3 w-full max-w-[85%] bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-indigo-800 mb-2.5">
                    {m.cards.title}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.cards.options?.map((opt: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        disabled={isPending}
                        className="px-3 py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200/60 transition disabled:opacity-50 active:scale-95"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 실시간 큐레이션 추천 리스트 (모바일 꽉 채우는 고품질 피드) */}
              {m.recommendations && m.recommendations.length > 0 && (
                <div className="mt-4 w-full space-y-3">
                  <div className="text-xs font-bold text-gray-800 px-1 flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>고객님 맞춤 매장 실시간 큐레이션 베스트</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {m.recommendations.map(biz => (
                      <div
                        key={biz.id}
                        className="bg-white border border-gray-200/80 hover:border-indigo-300 rounded-2xl p-4 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                              {biz.category}
                            </span>
                            <h4 className="font-bold text-sm text-gray-900 mt-1">{biz.name}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">📍 {biz.address}</p>
                          </div>
                          <a
                            href={`/shop/${encodeURIComponent(biz.slug || biz.id)}`}
                            target="_blank"
                            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
                          >
                            1:1 봇 예약 →
                          </a>
                        </div>
                        <p className="text-xs text-gray-600 mt-2.5 bg-gray-50 rounded-xl p-2.5 leading-relaxed">
                          💡 {biz.matchReason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <span>토보가 고객님의 취향을 정밀 분석 중입니다...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 입력창 (구글/챗GPT 스타일 심플 바) ── */}
        <div className="p-4 bg-white md:bg-transparent max-w-3xl w-full mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-white border border-gray-200 focus-within:border-indigo-500 rounded-2xl p-2 shadow-sm transition"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="예: 부산 사하구 쪽 조용한 1인 헤어샵이나 치킨집 찾아줘"
              disabled={isPending}
              className="flex-1 px-3 py-1.5 text-xs text-gray-800 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400">
              토보는 대화를 리드하며 고객님의 취향에 가장 부합하는 매장 봇을 찾아 연결합니다.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
