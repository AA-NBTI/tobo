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
  { id: 'all', label: '전체 탐색' },
  { id: 'beauty', label: '뷰티 / 헤어 / 펫' },
  { id: 'restaurant', label: '맛집 / 식당' },
  { id: 'clinic', label: '클리닉 / 상담' },
  { id: 'fitness', label: '운동 / 피트니스' },
]

export default function ToboMainConsole({ user }: { user?: any }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  // 초기 웰컴 메시지 제거 (사용자가 첫 입력을 시작하도록 클로드 화면과 동일하게 빈 화면 또는 미니멀 센터 유지)
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
            history: messages.map(m => ({ role: m.role, content: m.content }))
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
            content: '죄송합니다. 일시적인 연결 오류가 발생했습니다. 다시 말씀해 주세요.',
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
    <div className="flex h-screen w-full bg-[#1f1e1b] text-[#e8e6e3] overflow-hidden font-sans select-none">
      {/* ── 좌측 클로드 공식 사이드바 스타일 (#181715) ── */}
      <aside className="w-64 bg-[#181715] border-r border-[#2b2a27] hidden md:flex flex-col justify-between p-3.5 shrink-0">
        <div className="space-y-4">
          {/* Claude 상단 로고 */}
          <div className="flex items-center justify-between px-1.5 pt-1">
            <span className="font-serif text-xl font-medium tracking-tight text-[#ececec]">
              Claude
            </span>
          </div>

          {/* 새 대화 시작 버튼 */}
          <button
            onClick={() => {
              setMessages([])
              setStep(1)
              setContext({})
            }}
            className="w-full flex items-center gap-2.5 py-2 px-3 hover:bg-[#262522] text-[#d6d4d0] rounded-lg text-xs font-medium transition"
          >
            <span className="text-sm text-[#9b9893]">+</span>
            <span>새로 생성</span>
          </button>

          {/* 프로젝트 & 카테고리 네비게이션 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#9b9893] hover:bg-[#262522] rounded-lg cursor-pointer transition">
              <span>🗂</span>
              <span>프로젝트</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#9b9893] hover:bg-[#262522] rounded-lg cursor-pointer transition">
              <span>📄</span>
              <span>아티팩트</span>
            </div>
          </div>

          {/* 카테고리 영역 (상단바에서 이동) */}
          <div className="pt-2 border-t border-[#2b2a27]">
            <div className="text-[11px] font-medium text-[#7a7873] px-3 mb-1.5">
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
                  className={`w-full flex items-center px-3 py-1.5 rounded-lg text-xs transition text-left ${
                    selectedCategory === cat.id
                      ? 'bg-[#2b2a27] text-[#ececec] font-medium'
                      : 'text-[#9b9893] hover:bg-[#262522] hover:text-[#d6d4d0]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 등록 매장 목록 */}
          <div>
            <div className="text-[11px] font-medium text-[#7a7873] px-3 mb-1.5">
              채팅 및 작업
            </div>
            <div className="space-y-0.5 text-xs">
              <a
                href="/shop/몽펫샵-mt9qp7y1"
                target="_blank"
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[#9b9893] hover:bg-[#262522] hover:text-[#d6d4d0] transition"
              >
                <span className="truncate">몽펫샵 (사하구)</span>
              </a>
              <a
                href="/shop/머라카노-mt9r4fwr"
                target="_blank"
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[#9b9893] hover:bg-[#262522] hover:text-[#d6d4d0] transition"
              >
                <span className="truncate">머라카노 (부산)</span>
              </a>
            </div>
          </div>
        </div>

        {/* 좌측 최하단: 프로필 & 설정 영역 (상단 헤더 내용 통합) */}
        <div className="border-t border-[#2b2a27] pt-3 space-y-1 text-xs">
          <a
            href="/ko/admin"
            className="flex items-center justify-between px-3 py-2 text-[#9b9893] hover:text-[#ececec] rounded-lg hover:bg-[#262522] transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#3d3b36] flex items-center justify-center text-[10px] text-[#ececec]">
                ⚙️
              </div>
              <span className="text-xs">관리자 설정</span>
            </div>
            <span className="text-[10px] text-[#7a7873]">v1.11</span>
          </a>
        </div>
      </aside>

      {/* ── 중앙/우측 클로드 대화 영역 (#1f1e1b) ── */}
      <main className="flex-1 flex flex-col justify-between bg-[#1f1e1b] overflow-hidden relative">
        {/* 대화 타임라인 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 space-y-7 max-w-3xl w-full mx-auto select-text">
          {messages.length === 0 ? (
            /* 빈 화면일 때 클로드 중앙 로고 & 환영 뷰 */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 pt-24 text-[#9b9893]">
              <div className="w-12 h-12 rounded-2xl bg-[#2b2a27] flex items-center justify-center text-2xl font-serif text-[#d6d4d0]">
                ✳
              </div>
              <h2 className="text-lg font-serif font-medium text-[#ececec]">
                무엇을 도와드릴까요?
              </h2>
              <p className="text-xs text-[#7a7873] max-w-sm leading-relaxed">
                원하시는 지역, 시간, 서비스를 말씀해 주시면 딱 맞는 매장과 예약 상담을 이끌어 드립니다.
              </p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className="flex flex-col space-y-2">
                {/* 발신자 표시 */}
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-medium ${
                    m.role === 'user' ? 'bg-[#3d3b36] text-[#ececec]' : 'bg-[#c15f3e] text-white font-serif'
                  }`}>
                    {m.role === 'user' ? 'U' : '✳'}
                  </div>
                  <span className="text-xs font-medium text-[#7a7873]">
                    {m.role === 'user' ? 'User' : 'Claude'}
                  </span>
                </div>

                {/* 본문 텍스트 (클로드 타이포그래피) */}
                <div className="text-xs text-[#d6d4d0] leading-relaxed pl-7 whitespace-pre-wrap">
                  {m.content}
                </div>

                {/* 질문 선택지 칩 카드 (클로드 톤앤매너) */}
                {m.cards && (
                  <div className="ml-7 mt-2 bg-[#262522] border border-[#33322e] rounded-xl p-3.5 space-y-2.5">
                    <div className="text-xs font-medium text-[#d6d4d0]">
                      {m.cards.title}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.cards.options?.map((opt: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(opt)}
                          disabled={isPending}
                          className="px-3 py-1.5 bg-[#1f1e1b] hover:bg-[#2b2a27] text-[#d6d4d0] text-xs rounded-lg border border-[#383733] transition disabled:opacity-40 active:scale-95"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 매장 추천 리스트 (클로드 톤앤매너) */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div className="ml-7 mt-3 space-y-2">
                    <div className="text-xs font-medium text-[#9b9893]">
                      추천 매장 큐레이션
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {m.recommendations.map(biz => (
                        <div
                          key={biz.id}
                          className="bg-[#262522] border border-[#33322e] hover:border-[#474540] rounded-xl p-3.5 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] text-[#9b9893] bg-[#1f1e1b] px-2 py-0.5 rounded border border-[#33322e]">
                                {biz.category}
                              </span>
                              <h4 className="font-medium text-sm text-[#ececec] mt-1">{biz.name}</h4>
                              <p className="text-[11px] text-[#7a7873] mt-0.5">{biz.address}</p>
                            </div>
                            <a
                              href={`/shop/${encodeURIComponent(biz.slug || biz.id)}`}
                              target="_blank"
                              className="px-3 py-1.5 bg-[#ececec] text-[#181715] rounded-lg text-xs font-medium hover:bg-white transition"
                            >
                              예약하기 →
                            </a>
                          </div>
                          <p className="text-xs text-[#9b9893] mt-2 bg-[#1f1e1b] rounded-lg p-2 leading-relaxed">
                            {biz.matchReason}
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
            <div className="flex items-center gap-2 text-xs text-[#7a7873] pl-7">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c15f3e] animate-pulse"></div>
              <span>Claude가 분석하고 있습니다...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 클로드 입력창 스타일 ── */}
        <div className="p-4 md:p-6 max-w-3xl w-full mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-[#262522] border border-[#383733] focus-within:border-[#52504a] rounded-2xl px-4 py-2.5 transition shadow-sm"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              disabled={isPending}
              className="flex-1 text-xs text-[#ececec] bg-transparent focus:outline-none placeholder-[#7a7873]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isPending}
              className="p-1.5 bg-[#ececec] text-[#181715] rounded-xl hover:bg-white disabled:opacity-20 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-[#7a7873]">
              Claude는 사용자의 대화 맥락과 취향을 능동적으로 파악하여 최적의 매장을 연결합니다.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
