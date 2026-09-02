/**
 * 🏪 업체 사장님 AI 상담형 등록 페이지 — SSOT §13
 * /ko/register (또는 /en/register)
 *
 * 손님 예약 화면과 동일한 카드+텍스트 구조.
 * 카드 클릭 → /api/owner-onboarding (Zero LLM step-machine)
 * 텍스트 입력 → /api/owner-onboarding (LLM 기본정보 추출)
 */
'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  card?: any
}

const STEP_LABELS: Record<number, string> = {
  0: '카테고리 선택',
  1: '기본 정보 입력',
  2: '서비스 선택',
  3: '운영시간 설정',
  4: '약관 동의',
  5: '등록 완료',
}

export default function RegisterPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [collected, setCollected] = useState<Record<string, any>>({})
  const [selectedServices, setSelectedServices] = useState<any[]>([])
  const [done, setDone] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 페이지 진입 시 첫 카드 자동 표시
  useEffect(() => {
    startOnboarding()
  }, [])

  async function callOnboarding(body: object) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/owner-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류')
      return data
    } finally {
      setIsLoading(false)
    }
  }

  async function startOnboarding() {
    const data = await callOnboarding({ step: 0, message: '', collected: {} })
    appendBotMsg(data)
  }

  function appendBotMsg(data: any) {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: data.reply,
      card: data.card,
    }])
    if (data.nextStep !== undefined) setCurrentStep(data.nextStep)
    if (data.collected) setCollected(data.collected)
    if (data.onboardingStatus === 'pending_review') setDone(true)
  }

  // ── 카드 클릭 (결정론적) ──────────────────────────────────────
  async function handleCardClick(value: any) {
    if (isLoading) return
    const label = getLabel(value)

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: label,
    }])

    let body: any = { step: currentStep, collected, message: '' }

    if (currentStep === 0) {
      body.selected = value
    } else if (currentStep === 3) {
      body.selected = value
      body.closedDays = []
    } else if (currentStep === 4) {
      body.selected = value
    }

    const data = await callOnboarding(body)
    appendBotMsg(data)
  }

  // ── 서비스 다중 선택 제출 ─────────────────────────────────────
  async function handleServicesSubmit() {
    if (isLoading || selectedServices.length === 0) return
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: `서비스 ${selectedServices.length}개 선택 완료`,
    }])
    const data = await callOnboarding({ step: 2, collected, selectedServices })
    setSelectedServices([])
    appendBotMsg(data)
  }

  // ── 기본정보 폼 제출 ──────────────────────────────────────────
  async function handleBasicInfoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isLoading) return
    const form = new FormData(e.currentTarget)
    const fields = {
      name: form.get('name') as string,
      region: form.get('region') as string,
      address: form.get('address') as string,
      phone: form.get('phone') as string,
    }
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: `업체명: ${fields.name} / ${fields.region} / ${fields.address} / ${fields.phone}`,
    }])
    const data = await callOnboarding({ step: 1, collected, fields })
    appendBotMsg(data)
  }

  // ── 자유 텍스트 전송 (LLM 기본정보 추출) ─────────────────────
  async function handleTextSend() {
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg }])
    const data = await callOnboarding({ step: currentStep, collected, message: msg })
    appendBotMsg(data)
  }

  function getLabel(value: any): string {
    if (value?.category) return categoryLabel(value.category)
    if (value?.open) return `${value.open} ~ ${value.close}`
    if (value?.agreed) return '✅ 모두 동의하고 등록 신청'
    return JSON.stringify(value)
  }

  function categoryLabel(cat: string): string {
    const MAP: Record<string, string> = {
      pet_grooming: '✂️ 강아지 미용/목욕',
      clinic: '🏥 동물병원/진료',
      pet_hotel: '🏨 애견호텔/유치원',
      pet_dining: '🍽️ 애견동반 식당/카페',
      pet_pension: '🏕️ 애견동반 펜션/풀빌라',
    }
    return MAP[cat] || cat
  }

  const lastCard = [...messages].reverse().find(m => m.role === 'assistant' && m.card)?.card

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-5">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">등록 신청 완료!</h1>
          <p className="text-gray-500 leading-relaxed">
            업체 정보가 제출되었어요. 관리자 검수(1~2 영업일) 후 서비스에 노출됩니다.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>상태:</strong> 검토 대기 중 (pending_review)
          </div>
          <a href="/ko" className="block px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition">
            토보 홈으로 →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-base">T</div>
          <div>
            <div className="font-bold text-sm text-gray-900">업체 등록 상담</div>
            <div className="text-[10px] text-gray-400">SSOT §13 AI 상담형 등록</div>
          </div>
        </div>
        {/* 진행 단계 표시 */}
        <div className="flex items-center gap-1.5">
          {[0,1,2,3,4].map(s => (
            <div
              key={s}
              className={`w-6 h-1.5 rounded-full transition-all ${
                s < currentStep ? 'bg-teal-500' :
                s === currentStep ? 'bg-gray-900' : 'bg-gray-200'
              }`}
              title={STEP_LABELS[s]}
            />
          ))}
        </div>
      </header>

      {/* 대화 영역 */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}>
            {/* 버블 */}
            <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gray-900 text-white rounded-br-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
            }`}>
              {m.content}
            </div>

            {/* 카드 렌더링 */}
            {m.role === 'assistant' && m.card && (
              <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                  {m.card.title}
                </div>

                {/* 카테고리/시간/약관 단순 선택 카드 */}
                {m.card.options && m.card.type !== 'owner_service_catalog' && (
                  <div className="grid grid-cols-1 gap-2">
                    {m.card.options.map((opt: any, i: number) => (
                      <button
                        key={i}
                        id={`card-option-${m.card.cardId}-${i}`}
                        onClick={() => handleCardClick(opt.value)}
                        disabled={isLoading || currentStep > (messages.indexOf(m))}
                        className="px-4 py-2.5 text-sm text-left font-medium bg-gray-50 hover:bg-gray-900 hover:text-white border border-gray-200 rounded-xl transition active:scale-95 disabled:opacity-30"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* 서비스 카탈로그 — 다중 선택 */}
                {m.card.type === 'owner_service_catalog' && m.card.options && (
                  <div className="space-y-2">
                    {m.card.options.map((opt: any, i: number) => (
                      <label key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-teal-50 transition">
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-400"
                          checked={selectedServices.some((s: any) => s.presetId === opt.value.presetId)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedServices(prev => [...prev, opt.value])
                            } else {
                              setSelectedServices(prev => prev.filter((s: any) => s.presetId !== opt.value.presetId))
                            }
                          }}
                        />
                        <span className="text-xs text-gray-700 leading-relaxed">{opt.label}</span>
                      </label>
                    ))}
                    {selectedServices.length > 0 && (
                      <button
                        onClick={handleServicesSubmit}
                        disabled={isLoading}
                        className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition disabled:opacity-40"
                      >
                        {selectedServices.length}개 서비스 선택 완료 →
                      </button>
                    )}
                  </div>
                )}

                {/* 기본정보 폼 */}
                {m.card.type === 'owner_basic_info' && m.card.fields && (
                  <form onSubmit={handleBasicInfoSubmit} className="space-y-3">
                    {m.card.fields.map((f: any) => (
                      <div key={f.name}>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">
                          {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <input
                          name={f.name}
                          placeholder={f.placeholder}
                          required={f.required}
                          defaultValue={collected[f.name] || ''}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-gray-50"
                        />
                      </div>
                    ))}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition disabled:opacity-40"
                    >
                      {isLoading ? '확인 중...' : '기본 정보 제출 →'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <div className="flex items-start space-x-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 하단 텍스트 입력창 — 항상 노출 */}
      <div className="sticky bottom-0 bg-[#f8fafc] border-t border-gray-100 p-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 bg-white border border-gray-200 focus-within:border-gray-900 rounded-2xl px-4 py-3 shadow-sm transition">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTextSend() }}
            placeholder="카드를 클릭하거나 직접 입력하세요..."
            disabled={isLoading}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400 text-gray-900 disabled:opacity-40"
          />
          <button
            onClick={handleTextSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          카드 클릭 시 즉시 반응 · 텍스트로 직접 입력도 가능해요
        </p>
      </div>
    </div>
  )
}
