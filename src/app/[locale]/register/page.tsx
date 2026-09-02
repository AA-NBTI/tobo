/**
 * 🏪 업체 사장님 매장 등록 페이지
 * /ko/register
 *
 * 메인 대화창(ToboMainConsole)의 레이아웃, 사이드바, UI 테마, 카드+대화 구조를 100% 동일하게 공유
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import pkg from '../../../../package.json'

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

const CATEGORIES = [
  { id: 'all', label: '전체 상담' },
  { id: 'pet_grooming', label: '✂️ 미용 / 목욕' },
  { id: 'clinic', label: '🏥 병원 / 클리닉' },
  { id: 'pet_hotel', label: '🏨 호텔 / 유치원' },
  { id: 'pet_dining', label: '🍽️ 동반 식당/카페' },
  { id: 'pet_pension', label: '🏕️ 동반 펜션' },
]

export default function RegisterPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [collected, setCollected] = useState<Record<string, any>>({})
  const [selectedServices, setSelectedServices] = useState<any[]>([])
  const [done, setDone] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [hotBusinesses, setHotBusinesses] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user)
    })
    fetchHotBusinesses()
  }, [])

  async function fetchHotBusinesses() {
    const { data } = await supabase.from('businesses').select('name, slug, category').eq('is_active', true).limit(2)
    if (data) setHotBusinesses(data)
  }

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

  // ── 카드 클릭 ──────────────────────────────────────────────
  async function handleCardClick(value: any, labelText?: string) {
    if (isLoading) return
    const label = labelText || getLabel(value)

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
    return '선택 완료'
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

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#1e293b] overflow-hidden font-sans select-none">
      {/* ── 좌측 사이드바 (메인 화면과 동일한 스타일) ── */}
      <aside className="w-64 bg-[#f1f5f9] border-r border-[#e2e8f0] hidden md:flex flex-col justify-between p-3.5 shrink-0">
        <div className="space-y-5">
          {/* toboai 로고 & 버전 */}
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
                  사장님 온보딩
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0f172a] text-white rounded-full shadow-xs">
              V{pkg.version}
            </span>
          </div>

          {/* 손님 예약 화면으로 돌아가기 */}
          <a
            href="/ko"
            className="w-full flex items-center gap-2 py-2 px-3 bg-white hover:bg-[#ffffff] text-[#0f172a] rounded-xl text-xs font-semibold border border-[#e2e8f0] shadow-sm transition active:scale-98"
          >
            <span>← 손님 예약 홈으로 이동</span>
          </a>

          {/* 등록 단계 표시 */}
          <div className="bg-white/80 border border-[#e2e8f0] rounded-2xl p-3.5 space-y-2.5">
            <div className="text-[11px] font-bold text-[#0f172a]">
              진행 단계 ({Math.min(currentStep + 1, 5)}/5)
            </div>
            <div className="space-y-1.5 text-xs">
              {[0, 1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition ${
                    s < currentStep
                      ? 'text-teal-700 bg-teal-50 font-semibold'
                      : s === currentStep
                      ? 'text-[#0f172a] bg-[#e2e8f0] font-bold'
                      : 'text-[#94a3b8]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    s < currentStep ? 'bg-teal-500' : s === currentStep ? 'bg-[#0f172a]' : 'bg-[#cbd5e1]'
                  }`} />
                  <span>{STEP_LABELS[s]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 카테고리 퀵 메뉴 */}
          <div>
            <div className="text-[11px] font-semibold text-[#64748b] px-2 mb-1.5 uppercase tracking-wider">
              카테고리
            </div>
            <div className="space-y-0.5">
              {CATEGORIES.map(cat => (
                <a
                  key={cat.id}
                  href="/ko"
                  className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-medium transition text-left text-[#475569] hover:bg-[#e2e8f0]/60"
                >
                  <span>{cat.label}</span>
                </a>
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

      {/* ── 중앙/우측 대화창 영역 ── */}
      <main className="flex-1 flex flex-col justify-between bg-[#f8fafc] overflow-hidden relative h-full">
        {/* 모바일 상단 헤더 */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#f1f5f9] border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0f172a] text-white flex items-center justify-center font-black text-xs">
              T
            </div>
            <span className="font-bold text-sm text-[#0f172a]">사장님 매장 등록</span>
          </div>
          <a
            href="/ko"
            className="text-xs font-semibold text-[#0f172a] px-2.5 py-1 bg-white rounded-lg border border-[#e2e8f0]"
          >
            홈으로
          </a>
        </div>

        {/* 대화 타임라인 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 space-y-6 max-w-3xl w-full mx-auto select-text flex flex-col">
          {done ? (
            <div className="my-auto flex flex-col items-center justify-center text-center space-y-4 px-4 w-full py-8">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center font-bold text-3xl shadow-sm">
                🎉
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#0f172a]">매장 등록 신청 완료!</h2>
                <p className="text-xs md:text-sm text-[#64748b] max-w-md leading-relaxed">
                  작성해 주신 매장 정보가 정상적으로 접수되었습니다. 관리자 확인 후 즉시 손님 예약 목록에 노출됩니다.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 font-semibold">
                ⏳ 상태: 검토 대기 중 (확인 후 자동 노출)
              </div>
              <a
                href="/ko"
                className="mt-3 px-6 py-2.5 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-[#1e293b] transition shadow-xs"
              >
                메인 홈으로 이동하기 →
              </a>
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
                    {m.role === 'user' ? '사장님' : 'Tobo'}
                  </span>
                </div>

                {/* 본문 텍스트 */}
                <div className="text-xs text-[#1e293b] leading-relaxed pl-7 whitespace-pre-wrap font-normal">
                  {m.content}
                </div>

                {/* 상황별 선택 카드 */}
                {m.card && (
                  <div className="pl-7 pt-2">
                    <div className="p-3.5 bg-white border border-[#e2e8f0] rounded-2xl shadow-xs space-y-2.5 max-w-lg">
                      <div className="text-xs font-semibold text-[#0f172a] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f172a]" />
                        {m.card.title}
                      </div>

                      {/* 단순 선택 카드 */}
                      {m.card.options && m.card.type !== 'owner_service_catalog' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {m.card.options.map((opt: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleCardClick(opt.value, opt.label)}
                              disabled={isLoading}
                              className="px-3 py-2 text-xs font-medium text-left text-[#334155] bg-[#f8fafc] hover:bg-[#0f172a] hover:text-white border border-[#e2e8f0] rounded-xl transition active:scale-98 cursor-pointer disabled:opacity-40"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 서비스 다중 선택 */}
                      {m.card.type === 'owner_service_catalog' && m.card.options && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-1.5">
                            {m.card.options.map((opt: any, idx: number) => {
                              const isChecked = selectedServices.some((s: any) => s.presetId === opt.value.presetId)
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                                    isChecked
                                      ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                                      : 'bg-[#f8fafc] border-[#e2e8f0] text-[#334155] hover:bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 rounded border-gray-300 text-[#0f172a] focus:ring-0"
                                    checked={isChecked}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedServices(prev => [...prev, opt.value])
                                      } else {
                                        setSelectedServices(prev => prev.filter((s: any) => s.presetId !== opt.value.presetId))
                                      }
                                    }}
                                  />
                                  <span className="flex-1">{opt.label}</span>
                                </label>
                              )
                            })}
                          </div>
                          {selectedServices.length > 0 && (
                            <button
                              onClick={handleServicesSubmit}
                              disabled={isLoading}
                              className="w-full py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-xl hover:bg-[#1e293b] transition disabled:opacity-40 shadow-xs"
                            >
                              {selectedServices.length}개 서비스 선택 완료 →
                            </button>
                          )}
                        </div>
                      )}

                      {/* 기본 정보 폼 */}
                      {m.card.type === 'owner_basic_info' && m.card.fields && (
                        <form onSubmit={handleBasicInfoSubmit} className="space-y-2.5">
                          {m.card.fields.map((f: any) => (
                            <div key={f.name}>
                              <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                                {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                              </label>
                              <input
                                name={f.name}
                                placeholder={f.placeholder}
                                required={f.required}
                                defaultValue={collected[f.name] || ''}
                                className="w-full border border-[#cbd5e1] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#0f172a] bg-white"
                              />
                            </div>
                          ))}
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-xl hover:bg-[#1e293b] transition disabled:opacity-40 shadow-xs mt-2"
                          >
                            {isLoading ? '저장 중...' : '기본 정보 제출 →'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 pl-7">
              <span className="w-2 h-2 rounded-full bg-[#0f172a] animate-ping" />
              <span className="text-xs text-[#64748b]">처리 중...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 입력창 ── */}
        {!done && (
          <div className="p-3 md:p-6 max-w-3xl w-full mx-auto bg-[#f8fafc]">
            <form
              onSubmit={e => {
                e.preventDefault()
                handleTextSend()
              }}
              className="flex items-center gap-2 bg-white border border-[#cbd5e1] focus-within:border-[#0f172a] rounded-2xl px-4 py-2.5 shadow-2xs transition"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTextSend()
                  }
                }}
                rows={1}
                placeholder="카드를 클릭하거나 매장 정보를 직접 입력하세요... (Shift+Enter 줄바꿈)"
                disabled={isLoading}
                className="flex-1 resize-none text-xs text-[#0f172a] bg-transparent focus:outline-none placeholder-[#94a3b8] py-1 max-h-32 overflow-y-auto"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-1.5 bg-[#0f172a] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-20 transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-[#64748b]">
                버튼을 누르시면 단계별로 빠르게 안내되며, 직접 입력하셔도 돼요 😊
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
