'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, MessageSquare, Bot, Database, Sparkles, Send, Plus, CheckCircle, Clock, XCircle, User, Phone, Users } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dm' | 'group' | 'list'>('dm')
  
  // DM Simulation State
  const [dmMessage, setDmMessage] = useState('')
  const [dmLogs, setDmLogs] = useState<Array<{ sender: string; text: string; isAi: boolean }>>([
    { sender: 'AI 매니저', text: '안녕하세요! AI 예약 관리 매니저입니다. 예약 문의나 변경을 말씀해 주세요.', isAi: true }
  ])
  const [dmLoading, setDmloading] = useState(false)
  const [senderName, setSenderName] = useState('홍길동')

  // Group Simulation State
  const [groupMessage, setGroupMessage] = useState('')
  const [groupLogs, setGroupLogs] = useState<Array<{ sender: string; text: string; isAi: boolean; isSkipped?: boolean }>>([
    { sender: 'AI 매니저', text: '단체 예약 상담방입니다. 문의사항이 있으시면 불러주세요!', isAi: true }
  ])
  const [groupLoading, setGroupLoading] = useState(false)

  // Reservations State
  const [reservations, setReservations] = useState<any[]>([])
  const [resLoading, setResLoading] = useState(false)
  
  // New Manual Reservation Form
  const [newRes, setNewRes] = useState({ customerName: '', customerPhone: '', reservationTime: '', partySize: 2, notes: '' })

  const fetchReservations = async () => {
    setResLoading(true)
    try {
      const res = await fetch('/api/reservations')
      const data = await res.json()
      if (data.reservations) {
        setReservations(data.reservations)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setResLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'list') {
      fetchReservations()
    }
  }, [activeTab])

  // Handle DM Send
  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dmMessage.trim() || dmLoading) return

    const userText = dmMessage
    setDmMessage('')
    setDmLogs(prev => [...prev, { sender: senderName, text: userText, isAi: false }])
    setDmloading(true)

    try {
      const res = await fetch('/api/ai-reply-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: '00000000-0000-0000-0000-000000000001',
          senderId: '00000000-0000-0000-0000-000000000002',
          roomId: '00000000-0000-0000-0000-000000000003',
          message: userText,
          senderName: senderName
        })
      })
      const data = await res.json()
      if (data.reply) {
        setDmLogs(prev => [...prev, { sender: 'AI 매니저', text: data.reply, isAi: true }])
      } else if (data.error) {
        setDmLogs(prev => [...prev, { sender: '시스템', text: `[에러]: ${data.error}`, isAi: true }])
      }
      if (data.reservation) {
        setDmLogs(prev => [...prev, { sender: '시스템', text: `🎉 예약이 자동 확정되었습니다! (일시: ${data.reservation.reservation_time})`, isAi: true }])
      }
    } catch (err: any) {
      setDmLogs(prev => [...prev, { sender: '시스템', text: '오류가 발생했습니다.', isAi: true }])
    } finally {
      setDmloading(false)
    }
  }

  // Handle Group Send
  const handleSendGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupMessage.trim() || groupLoading) return

    const userText = groupMessage
    setGroupMessage('')
    setGroupLogs(prev => [...prev, { sender: '참여자 A', text: userText, isAi: false }])
    setGroupLoading(true)

    try {
      const res = await fetch('/api/ai-reply-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId: '00000000-0000-0000-0000-000000000001',
          senderId: '00000000-0000-0000-0000-000000000002',
          roomId: '00000000-0000-0000-0000-000000000004',
          message: userText,
          senderName: '참여자 A'
        })
      })
      const data = await res.json()
      if (data.skipped) {
        setGroupLogs(prev => [...prev, { sender: 'AI 매니저', text: '[SKIP] (사적 대화로 판단하여 응답하지 않음)', isAi: true, isSkipped: true }])
      } else if (data.reply) {
        setGroupLogs(prev => [...prev, { sender: 'AI 매니저', text: data.reply, isAi: true }])
      }
    } catch (err: any) {
      setGroupLogs(prev => [...prev, { sender: '시스템', text: '오류가 발생했습니다.', isAi: true }])
    } finally {
      setGroupLoading(false)
    }
  }

  // Manual Reservation Create
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRes.customerName || !newRes.reservationTime) return

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: newRes.customerName,
          customerPhone: newRes.customerPhone,
          reservationTime: newRes.reservationTime,
          partySize: newRes.partySize,
          notes: newRes.notes
        })
      })
      const data = await res.json()
      if (data.success) {
        setNewRes({ customerName: '', customerPhone: '', reservationTime: '', partySize: 2, notes: '' })
        fetchReservations()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-300 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            AI Core (Gemma) + Supabase RAG Vector Memory
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
            AI 기반 자동 예약 관리 시스템
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            1:1 DM 예약 상담, 단톡방 개입 제어, RAG Vector DB 기반 기억 연동 및 예약 현황 대시보드를 직접 테스트해보세요.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('dm')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              activeTab === 'dm'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/25'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            1:1 DM 예약 상담 AI
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              activeTab === 'group'
                ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            단톡방 개입 AI
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
              activeTab === 'list'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            예약 현황 & 관리
          </button>
        </div>

        {/* TAB 1: DM SIMULATION */}
        {activeTab === 'dm' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                1:1 DM AI 예약 상담 대화 테스트
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">고객 이름:</span>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1 w-24"
                />
              </div>
            </div>

            {/* Chat Box */}
            <div className="h-80 overflow-y-auto bg-slate-950/60 rounded-xl p-4 mb-4 space-y-3 border border-slate-800/60">
              {dmLogs.map((log, index) => (
                <div key={index} className={`flex ${log.isAi ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    log.isAi 
                      ? 'bg-slate-800 border border-slate-700 text-slate-200' 
                      : 'bg-cyan-500 text-slate-950 font-medium'
                  }`}>
                    <div className="text-[10px] opacity-60 mb-0.5">{log.sender}</div>
                    <div>{log.text}</div>
                  </div>
                </div>
              ))}
              {dmLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl px-4 py-2 text-xs flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI 매니저 답변 생성 중...
                  </div>
                </div>
              )}
            </div>

            {/* DM Form */}
            <form onSubmit={handleSendDM} className="flex gap-2">
              <input
                type="text"
                value={dmMessage}
                onChange={e => setDmMessage(e.target.value)}
                placeholder="예: 내일 저녁 6시에 4명 예약 가능한가요?"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={dmLoading}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                전송
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: GROUP SIMULATION */}
        {activeTab === 'group' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
            <div className="mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                단톡방 AI 개입 & 스킵([SKIP]) 시뮬레이션
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                사적인 대화에는 AI가 반응하지 않고 [SKIP] 처리하며, AI 매니저를 호출하거나 질문 시에만 응답합니다.
              </p>
            </div>

            {/* Chat Box */}
            <div className="h-80 overflow-y-auto bg-slate-950/60 rounded-xl p-4 mb-4 space-y-3 border border-slate-800/60">
              {groupLogs.map((log, index) => (
                <div key={index} className={`flex ${log.isAi ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    log.isSkipped 
                      ? 'bg-slate-900/40 border border-slate-800 text-slate-500 text-xs italic'
                      : log.isAi 
                        ? 'bg-indigo-950/60 border border-indigo-800 text-indigo-200' 
                        : 'bg-indigo-500 text-white font-medium'
                  }`}>
                    <div className="text-[10px] opacity-60 mb-0.5">{log.sender}</div>
                    <div>{log.text}</div>
                  </div>
                </div>
              ))}
              {groupLoading && (
                <div className="flex justify-start">
                  <div className="bg-indigo-950/40 text-indigo-400 rounded-2xl px-4 py-2 text-xs flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI 매니저 대화 개입 여부 판단 중...
                  </div>
                </div>
              )}
            </div>

            {/* Group Form */}
            <form onSubmit={handleSendGroup} className="flex gap-2">
              <input
                type="text"
                value={groupMessage}
                onChange={e => setGroupMessage(e.target.value)}
                placeholder="예: AI 매니저님, 단체 예약 시 할인 혜택이 있나요?"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={groupLoading}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                전송
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: RESERVATION LIST & MANUAL CREATE */}
        {activeTab === 'list' && (
          <div className="space-y-6">
            {/* Manual Create Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-md font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> 신규 예약 수동 추가
              </h3>
              <form onSubmit={handleCreateReservation} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="고객 성함 *"
                  value={newRes.customerName}
                  onChange={e => setNewRes({ ...newRes, customerName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  required
                />
                <input
                  type="text"
                  placeholder="연락처"
                  value={newRes.customerPhone}
                  onChange={e => setNewRes({ ...newRes, customerPhone: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
                <input
                  type="datetime-local"
                  value={newRes.reservationTime}
                  onChange={e => setNewRes({ ...newRes, reservationTime: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  required
                />
                <input
                  type="number"
                  placeholder="인원 수"
                  value={newRes.partySize}
                  onChange={e => setNewRes({ ...newRes, partySize: parseInt(e.target.value) || 1 })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
                <input
                  type="text"
                  placeholder="비고 / 메모"
                  value={newRes.notes}
                  onChange={e => setNewRes({ ...newRes, notes: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 md:col-span-2"
                />
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 px-4 rounded-xl text-sm transition-all md:col-span-3"
                >
                  예약 추가하기
                </button>
              </form>
            </div>

            {/* Reservation Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" /> 확정된 예약 목록
                </h3>
                <button onClick={fetchReservations} className="text-xs text-slate-400 hover:text-emerald-400 underline">
                  새로고침
                </button>
              </div>

              {resLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">예약 데이터 불러오는 중...</div>
              ) : reservations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">등록된 예약 내역이 없습니다. (위 대화창에서 AI에게 예약을 요청해 보세요!)</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3">고객명</th>
                        <th className="py-3 px-3">연락처</th>
                        <th className="py-3 px-3">예약일시</th>
                        <th className="py-3 px-3">인원</th>
                        <th className="py-3 px-3">상태</th>
                        <th className="py-3 px-3">메모</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {reservations.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3 font-medium text-slate-100 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" /> {res.customer_name}
                          </td>
                          <td className="py-3 px-3">{res.customer_phone || '-'}</td>
                          <td className="py-3 px-3 text-emerald-400 font-mono">
                            {new Date(res.reservation_time).toLocaleString('ko-KR')}
                          </td>
                          <td className="py-3 px-3">{res.party_size}명</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {res.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{res.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
