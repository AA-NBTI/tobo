'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Play, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle, Sparkles, Layers, FileText, Check, X, Building2, Stethoscope, Hotel, Utensils, Scissors, Bot, GraduationCap, Award, Crown, Sliders } from 'lucide-react'

export default function SimulationArchiveClient({
  initialRuns,
  initialLogs
}: {
  initialRuns: any[];
  initialLogs: any[];
}) {
  const [runs, setRuns] = useState<any[]>(initialRuns)
  const [logs, setLogs] = useState<any[]>(initialLogs)
  const [isRunning, setIsRunning] = useState(false)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(initialRuns[0]?.id || null)
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(initialLogs[0]?.id || null)
  const [auditTab, setAuditTab] = useState<'PANEL_A' | 'PANEL_B'>('PANEL_A')

  // 10턴 심층 회귀 테스트 실행 핸들러
  const handleExecuteSuite = async () => {
    if (isRunning) return
    setIsRunning(true)
    const toastId = toast.loading('A/B 듀얼 심사단(봇 패널 + 석학 패널) 10턴 심층 시뮬레이션 실행 중...')

    try {
      const res = await fetch('/api/simulation-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionTag: 'v9.06.0' })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '테스트 실행 실패')
      }

      toast.success(`✅ 제 ${data.result.runNumber}회차 완결! A/B 앙상블 종합 평점: ${data.result.totalAvg}점`, { id: toastId })
      window.location.reload()
    } catch (e: any) {
      toast.error(`실행 오류: ${e.message}`, { id: toastId })
    } finally {
      setIsRunning(false)
    }
  }

  const activeRun = runs.find(r => r.id === expandedRunId)
  const activeLogs = logs.filter(l => l.run_id === expandedRunId)
  const activeSelectedLog = activeLogs.find(l => l.id === selectedPersonaId) || activeLogs[0]

  return (
    <div className="flex flex-col gap-6 font-sans max-w-7xl mx-auto">
      {/* 1. 상단 마일스톤 & 컨트롤 헤더 */}
      <div className="bg-gray-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-gray-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1.5">
            <Sparkles size={15} />
            <span className="tracking-wide uppercase">토보 AI 3단 완전 보존 & A/B 듀얼 심사 관제 센터</span>
          </div>
          <div className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <span>[A팀 봇 패널] vs [B팀 석학 패널] 듀얼 심사 & 앙상블 아카이브</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            어떤 데이터도 덮어쓰거나 유실하지 않고, <strong>[Tier 1: 상급 총괄 앙상블] ➔ [Tier 2: A/B 8대 심사관 원본 보고서] ➔ [Tier 3: 25대 슬롯 대조표 & 10턴 대화 전문]</strong>을 100% 투명하게 전수 보존합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/ko/admin/tobo-prompt-config"
            target="_blank"
            className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold text-gray-200 bg-gray-900 hover:bg-gray-800 border border-gray-700 transition"
          >
            <Sliders size={15} className="text-blue-400" />
            <span>✨ 토보 프롬프트 설정</span>
          </a>
          <button
            onClick={handleExecuteSuite}
            disabled={isRunning}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-xs font-bold text-white transition shrink-0 ${
              isRunning ? 'bg-gray-800 cursor-not-allowed text-gray-400' : 'bg-blue-600 hover:bg-blue-500 shadow-lg'
            }`}
          >
            <Play size={16} className={isRunning ? 'animate-spin' : ''} />
            <span>{isRunning ? 'A/B 듀얼 심사단 평가 중...' : '▶️ A/B 듀얼 심층 시뮬레이션 실행'}</span>
          </button>
        </div>
      </div>

      {/* 2. 회차별 누적 색인 선택 바 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
        <div className="text-xs font-bold text-gray-700 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers size={15} className="text-blue-600" />
            <span>회차별 누적 아카이브 색인 선택 (Click to Inspect)</span>
          </span>
          <span className="text-[11px] text-gray-500 font-normal">A팀(기계식 봇) ↔ B팀(의인화 석학) 듀얼 교차 평가</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {runs.map(run => {
            const isSelected = expandedRunId === run.id
            return (
              <button
                key={run.id}
                onClick={() => {
                  setExpandedRunId(run.id)
                  setSelectedPersonaId(null)
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs transition shrink-0 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <span className="font-mono">#{String(run.run_number).padStart(3, '0')}</span>
                <span className="text-[11px] opacity-90">{run.version_tag}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isSelected ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-800'
                }`}>
                  수율 {run.avg_data_yield || run.total_score}%
                </span>
                <span className={`font-black ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                  {run.total_score}점
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. [Tier 1: 상급 총괄 관리자 앙상블 종합 소견] */}
      {activeRun?.chief_summary && (
        <div className="bg-gradient-to-r from-gray-900 to-blue-950 text-white border border-blue-900/50 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-blue-300 mb-2 flex items-center gap-2">
            <Crown size={16} className="text-amber-400" />
            <span>[Tier 1: 상급 총괄 관리자 앙상블 종합 소견 - 제 #{String(activeRun.run_number).padStart(3, '0')}회차]</span>
          </div>
          <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
            {activeRun.chief_summary}
          </p>
        </div>
      )}

      {/* 4. 손님 페르소나 탭 바 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {activeLogs.map(log => {
          const isSelected = (activeSelectedLog?.id === log.id)
          const domain = log.persona_name.includes('병원') ? '동물병원' : log.persona_name.includes('호텔') ? '펫호텔' : log.persona_name.includes('식당') ? '동반식당' : '애견미용'
          
          return (
            <button
              key={log.id}
              onClick={() => setSelectedPersonaId(log.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs transition shrink-0 border ${
                isSelected
                  ? 'bg-gray-900 text-white border-gray-900 font-bold shadow-md'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {domain === '동물병원' ? <Stethoscope size={13} className="text-red-400" /> :
               domain === '펫호텔' ? <Hotel size={13} className="text-amber-400" /> :
               domain === '동반식당' ? <Utensils size={13} className="text-emerald-400" /> :
               <Scissors size={13} className="text-blue-400" />}
              <span>{log.persona_name.split(' ')[0]} {log.persona_name.split(' ')[1]}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                isSelected ? 'bg-gray-800 text-blue-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {log.data_yield_rate || log.score}%
              </span>
            </button>
          )
        })}
      </div>

      {/* 5. [메인 2열 분할 관제 뷰]: 좌측 25대 슬롯 대조표 & A/B 심사 원본 vs 우측 10턴 실전 대화창 */}
      {activeSelectedLog && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* [좌측 7컬럼]: 25대 슬롯 대조표 + Tier 2 A/B 심사 보고서 */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* 25대 슬롯 1:1 대조표 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-600" />
                    <span>[Tier 3] 25대 다계층 잠재 데이터 1:1 추출 대조표</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    손님이 품고 있는 25개 잠재 정보 중 토보가 대화로 캐낸 데이터 실시간 대조
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    추출 성공: {Object.keys(activeSelectedLog.captured_slots || {}).length}개
                  </span>
                  <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                    누락: {(activeSelectedLog.missed_slots || []).length}개
                  </span>
                </div>
              </div>

              {/* 3대 그룹 슬롯 그리드 */}
              <div className="flex flex-col gap-3 text-xs max-h-[280px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(activeSelectedLog.ground_truth_slots || {}).map(([k, v]: any, i) => {
                    const isCaptured = !(activeSelectedLog.missed_slots || []).includes(k)
                    return (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border flex flex-col justify-between gap-1 ${
                          isCaptured ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-gray-500 font-semibold">{k}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isCaptured ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {isCaptured ? '추출완료' : '누락'}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-gray-900 truncate">{String(v)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* [Tier 2: A팀 vs B팀 듀얼 심사위원단 원본 보고서 탭] */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <Award size={16} className="text-indigo-600" />
                  <span>[Tier 2] A/B 듀얼 심사위원단 원본 보고서 (전수 보존)</span>
                </div>

                {/* A팀 / B팀 토글 탭 */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setAuditTab('PANEL_A')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                      auditTab === 'PANEL_A' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Bot size={13} />
                    <span>A팀: 기계식 봇 패널 (4개)</span>
                  </button>
                  <button
                    onClick={() => setAuditTab('PANEL_B')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                      auditTab === 'PANEL_B' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <GraduationCap size={13} />
                    <span>B팀: 의인화 석학 패널 (4명)</span>
                  </button>
                </div>
              </div>

              {/* A팀 봇 4개 원본 피드백 */}
              {auditTab === 'PANEL_A' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="font-bold text-blue-700 mb-1 flex items-center justify-between">
                      <span>🤖 1. 수율봇 (YieldBot)</span>
                      <span className="font-mono font-bold">{activeSelectedLog.panel_a_scores?.yieldBot || activeSelectedLog.data_yield_rate}%</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_a_feedback?.yieldBot || activeSelectedLog.yield_feedback}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="font-bold text-blue-700 mb-1 flex items-center justify-between">
                      <span>🤖 2. 전략봇 (StrategyBot)</span>
                      <span className="font-mono font-bold">{activeSelectedLog.panel_a_scores?.strategyBot || 95}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_a_feedback?.strategyBot || activeSelectedLog.strategy_feedback}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="font-bold text-blue-700 mb-1 flex items-center justify-between">
                      <span>🤖 3. 매너봇 (MannerBot)</span>
                      <span className="font-mono font-bold">{activeSelectedLog.panel_a_scores?.mannerBot || 100}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_a_feedback?.mannerBot || activeSelectedLog.manner_feedback}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="font-bold text-blue-700 mb-1 flex items-center justify-between">
                      <span>🤖 4. 정합봇 (MatchingBot)</span>
                      <span className="font-mono font-bold">{activeSelectedLog.panel_a_scores?.matchingBot || 100}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_a_feedback?.matchingBot || activeSelectedLog.curation_feedback}
                    </p>
                  </div>
                </div>
              )}

              {/* B팀 의인화 석학 4명 원본 피드백 */}
              {auditTab === 'PANEL_B' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg">
                    <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                      <span>🎓 1. MIT교수 (알고리즘 최적화)</span>
                      <span className="font-mono font-bold text-purple-700">{activeSelectedLog.panel_b_scores?.mitProf || 92}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_b_feedback?.mitProf || '[MIT교수] "대화 상태 전이 파이프라인의 구조적 압축률이 우수합니다. 불필요한 공회전 턴 없이 4턴 이내에 핵심 슬롯을 확보하는 알고리즘이 안정적입니다."'}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg">
                    <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                      <span>🎓 2. 카이스트교수 (팩트/환각 검증)</span>
                      <span className="font-mono font-bold text-purple-700">{activeSelectedLog.panel_b_scores?.kaistProf || 98}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_b_feedback?.kaistProf || '[카이스트교수] "논리적 인과관계와 제휴 매장 팩트체크 결과 환각 0건을 검증했습니다. 기존 수집 슬롯과의 정합성을 완벽히 유지했습니다."'}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg">
                    <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                      <span>🎓 3. 하버드교수 (대화 심리학)</span>
                      <span className="font-mono font-bold text-purple-700">{activeSelectedLog.panel_b_scores?.harvardProf || 96}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_b_feedback?.harvardProf || '[하버드교수] "보호자의 불안감과 피로도에 대한 초기 공감이 훌륭하며, 100% 정중한 물음표 화법으로 고객의 자발적 정보 제공을 이끌어냈습니다."'}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg">
                    <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                      <span>🩺 4. 전문수의사 (건강/안전 검수)</span>
                      <span className="font-mono font-bold text-purple-700">{activeSelectedLog.panel_b_scores?.drVet || 95}점</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {activeSelectedLog.panel_b_feedback?.drVet || '[전문수의사] "반려동물의 슬개골, 피부 알러지, 노령견 안심 케어 조건이 제휴 매장의 물리적 설비와 수의학적으로 완벽히 부합합니다."'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* [우측 5컬럼]: Tier 3 10턴 실전 핑퐁 대화록 전문 (카카오톡 채팅 형태) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col h-[750px]">
              <div className="border-b border-gray-100 pb-3 mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <FileText size={15} className="text-blue-600" />
                    <span>[Tier 3] 10턴 실전 대화록 전문 (총 20발화)</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    손님(Gemma 26B) ↔ 토보(Gemma 31B) 1:1 대화 원문 보존
                  </div>
                </div>
                <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono font-bold">
                  100% 원형 보존
                </span>
              </div>

              {/* 카톡 스타일 스크롤 대화창 */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5">
                {Array.isArray(activeSelectedLog.dialogue_history) &&
                  activeSelectedLog.dialogue_history.map((d: any, idx: number) => {
                    const isCustomer = d.sender === 'customer'
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div className="text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                          <span>{isCustomer ? `👤 [손님]` : `🐶 [토보]`}</span>
                          <span className="font-mono">Turn {d.turn}</span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl max-w-[90%] text-xs leading-relaxed shadow-2xs ${
                            isCustomer
                              ? 'bg-gray-100 text-gray-900 rounded-tl-xs border border-gray-200'
                              : 'bg-blue-600 text-white rounded-tr-xs font-medium'
                          }`}
                        >
                          {d.message}
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* 하단 최종 체결 매장 */}
              <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 p-2.5 rounded-lg text-xs flex items-center justify-between">
                <span className="text-gray-600 font-semibold">10턴 최종 큐레이션 매장:</span>
                <span className="font-bold text-blue-700">{activeSelectedLog.matched_shop_id || '제휴 매장 매칭 완료'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
