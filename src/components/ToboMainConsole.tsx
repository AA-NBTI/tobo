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
  { id: 'all', label: '전체 상담' },
  { id: 'beauty', label: '뷰티 / 헤어 / 펫' },
  { id: 'restaurant', label: '맛집 / 식당' },
  { id: 'clinic', label: '클리닉 / 상담' },
  { id: 'fitness', label: '운동 / 피트니스' },
]

export default function ToboMainConsole({ user }: { user?: any }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '반갑습니다. 실패 없는 맞춤 예약과 실시간 상담을 이끌어 드리는 AI 컨시어지 토보(Tobo)입니다.\n\n어느 지역에서 어떤 매장이나 서비스를 찾고 계신가요?',
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
    <div className="flex h-[calc(100vh-64px)] bg-[#212121] text-gray-200 overflow-hidden font-sans">
      {/* ── 좌측 미니멀 다크 사이드바 (ChatGPT/Claude 스타일) ── */}
      <aside className="w-64 bg-[#171717] border-r border-[#2f2f2f] hidden md:flex flex-col justify-between p-3 shrink-0">
        <div className="space-y-4">
          {/* 새 상담 시작 버튼 */}
          <button
            onClick={() => {
              setMessages([
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: '새로운 상담을 시작합니다. 어떤 서비스를 찾아드릴까요?',
                  time: '지금'
                }
              ])
              setStep(1)
              setContext({})
            }}
            className="w-full flex items-center gap-2 py-2.5 px-3 bg-[#212121] hover:bg-[#2f2f2f] text-gray-200 border border-[#333333] rounded-lg text-xs font-medium transition"
          >
            <span className="text-sm">+</span>
            <span>새 예약·상담</span>
          </button>

          {/* 카테고리 퀵 메뉴 */}
          <div>
            <div className="text-[11px] font-medium text-gray-500 px-2 mb-1">
              카테고리
            </div>
            <div className="space-y-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    handleSend(`${cat.label} 관련해서 추천 및 예약 상담해줘`)
                  }}
                  className={`w-full flex items-center px-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                    selectedCategory === cat.id
                      ? 'bg-[#2f2f2f] text-white font-medium'
                      : 'text-gray-400 hover:bg-[#212121] hover:text-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 주요 제휴 샵 퀵 매칭 */}
          <div>
            <div className="text-[11px] font-medium text-gray-500 px-2 mb-1">
              등록 매장 바로가기
            </div>
            <div className="space-y-0.5 text-xs">
              <a
                href="/shop/몽펫샵-mt9qp7y1"
                target="_blank"
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-[#212121] hover:text-gray-200 transition"
              >
                <span>몽펫샵 (사하구)</span>
                <span className="text-[10px] text-gray-500">Shop</span>
              </a>
              <a
                href="/shop/머라카노-mt9r4fwr"
                target="_blank"
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-[#212121] hover:text-gray-200 transition"
              >
                <span>머라카노 (부산)</span>
                <span className="text-[10px] text-gray-500">Shop</span>
              </a>
            </div>
          </div>
        </div>

        {/* 하단 관리자 링크 */}
        <div className="border-t border-[#2f2f2f] pt-2 text-xs">
          <a
            href="/ko/admin"
            className="flex items-center gap-2 px-2.5 py-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#212121] transition"
          >
            <span>관리자 설정</span>
          </a>
        </div>
      </aside>

      {/* ── 중앙/우측 대화창 (ChatGPT/Claude 스타일 순수 흑백 모노톤) ── */}
      <main className="flex-1 flex flex-col justify-between bg-[#212121] overflow-hidden relative">
        {/* 대화 메시지 타임라인 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-3xl w-full mx-auto">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* 발신자 라벨 */}
              <span className="text-[11px] text-gray-500 mb-1 px-1">
                {m.role === 'user' ? 'You' : 'Tobo'}
              </span>

              {/* 말풍선 */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#2f2f2f] text-white rounded-tr-none border border-[#383838]'
                    : 'bg-[#262626] text-gray-200 border border-[#333333] rounded-tl-none'
                }`}
              >
                {m.content}
              </div>

              {/* 능동형 인터랙티브 선택지 카드 (모노톤 칩) */}
              {m.cards && (
                <div className="mt-3 w-full max-w-[85%] bg-[#262626] border border-[#383838] rounded-xl p-3.5">
                  <div className="text-xs font-medium text-gray-300 mb-2">
                    {m.cards.title}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.cards.options?.map((opt: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        disabled={isPending}
                        className="px-3 py-1.5 bg-[#2f2f2f] hover:bg-[#383838] text-gray-200 text-xs rounded-lg border border-[#404040] transition disabled:opacity-40 active:scale-95"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 실시간 큐레이션 추천 리스트 (모노톤 카드) */}
              {m.recommendations && m.recommendations.length > 0 && (
                <div className="mt-4 w-full space-y-2.5">
                  <div className="text-xs font-medium text-gray-400 px-1">
                    맞춤 매장 실시간 추천
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {m.recommendations.map(biz => (
                      <div
                        key={biz.id}
                        className="bg-[#262626] border border-[#383838] hover:border-gray-500 rounded-xl p-3.5 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] text-gray-400 bg-[#333333] px-2 py-0.5 rounded">
                              {biz.category}
                            </span>
                            <h4 className="font-semibold text-sm text-white mt-1">{biz.name}</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">{biz.address}</p>
                          </div>
                          <a
                            href={`/shop/${encodeURIComponent(biz.slug || biz.id)}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-gray-200 transition"
                          >
                            상세 / 예약 →
                          </a>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 bg-[#1f1f1f] rounded-lg p-2 leading-relaxed">
                          {biz.matchReason}
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
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></div>
              <span>토보가 분석 중입니다...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 입력창 (ChatGPT/Claude 스타일 미니멀 다크 바) ── */}
        <div className="p-4 max-w-3xl w-full mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-[#2f2f2f] border border-[#404040] focus-within:border-gray-400 rounded-2xl px-3 py-2 transition"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="메시지를 입력하세요 (예: 부산 사하구 조용한 1인 헤어샵 찾아줘)"
              disabled={isPending}
              className="flex-1 text-xs text-white bg-transparent focus:outline-none placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="p-1.5 bg-white text-black rounded-xl hover:bg-gray-200 disabled:opacity-30 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-500">
              Tobo can facilitate reservations and guide recommendations based on your preferences.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
