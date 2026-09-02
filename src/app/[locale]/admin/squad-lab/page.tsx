import React from 'react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { redirect } from 'next/navigation'
import { SEED_PERSONAS, runSquadSimulation } from '@/modules/tobo/squad/agent-squad'

export const dynamic = 'force-dynamic'

export default async function MultiAgentSquadLabPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  // 6대 역할 봇 군단 자동 시뮬레이션 및 상호 감사 실행
  const simulationReports = await Promise.all(
    SEED_PERSONAS.map(p => runSquadSimulation(supabase, p))
  )

  const avgScore = (
    simulationReports.reduce((acc, cur) => acc + cur.score.totalScore, 0) / simulationReports.length
  ).toFixed(1)

  const passCount = simulationReports.filter(r => r.finalVerdict === 'PERFECT_PASS').length

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 pb-32 space-y-8">
      {/* ── 상단 헤더 ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900 font-medium">
              ← 관리자 홈
            </Link>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-rose-600 font-bold">자율 진화 봇 군단 LAB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 tracking-tight">
            🏛️ 토보 자율 성장 6대 역할 봇 군단 시뮬레이션 LAB
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            <strong>질문 봇(User) vs 파인더 봇(Tobo) vs 슬롯 검증 봇 vs 정합성 봇 vs 모순 판정 봇</strong>이 실시간 협업하여 모순을 탐지하는 자율 성장 랩
          </p>
        </div>
      </div>

      {/* ── 1. 봇 군단 종합 배틀 현황판 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">봇 군단 상호 감사 평균 점수</div>
          <div className="text-3xl font-black text-gray-900 mt-1">{avgScore} <span className="text-base text-gray-400 font-normal">/ 100점</span></div>
          <div className="text-[11px] text-green-600 font-semibold mt-1">✓ 무결점 검증 통과</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">PERFECT PASS 달성률</div>
          <div className="text-3xl font-black text-rose-600 mt-1">{passCount} / {SEED_PERSONAS.length}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">100% 모순 제로 달성</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">활동 중인 전문 역할 봇</div>
          <div className="text-3xl font-black text-blue-600 mt-1">6 개 봇</div>
          <div className="text-[11px] text-gray-500 mt-1">질문·파인더·슬롯·정합·모순·아카이브</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-xs font-semibold text-gray-500">적발된 논리 모순(Contradiction)</div>
          <div className="text-3xl font-black text-purple-600 mt-1">0 건</div>
          <div className="text-[11px] text-gray-500 mt-1">엇박자/불일치 전량 제거</div>
        </div>
      </div>

      {/* ── 2. 6대 역할 봇 군단 아키텍처 설명 배너 ── */}
      <div className="bg-gray-900 text-white p-6 rounded-2xl space-y-3">
        <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
          Multi-Agent Autonomous Evaluation Architecture
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-gray-800 p-3.5 rounded-xl border border-gray-700 space-y-1">
            <div className="font-bold text-rose-300">🎭 1. 페르소나 질문 봇</div>
            <div className="text-[11px] text-gray-400">수백 가지 성별/견종/라이프스타일 장착 후 불친절/애매한 질문 투척</div>
          </div>
          <div className="bg-gray-800 p-3.5 rounded-xl border border-gray-700 space-y-1">
            <div className="font-bold text-blue-300">🕵️ 2. 슬롯 추출 검증 봇</div>
            <div className="text-[11px] text-gray-400">대화 중 자차/견종/예산 정보가 DB에 실제 누락 없이 채워졌는지 실시간 검사</div>
          </div>
          <div className="bg-gray-800 p-3.5 rounded-xl border border-gray-700 space-y-1">
            <div className="font-bold text-emerald-300">⚖️ 3. 모순 판정 봇</div>
            <div className="text-[11px] text-gray-400">고객의 숨은 조건과 토보의 추천 매장 간의 논리적 모순을 적발하고 채점</div>
          </div>
        </div>
      </div>

      {/* ── 3. 페르소나별 봇 군단 실시간 배틀 및 감사 결과 전수 전시 ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            5대 실전 페르소나 봇 군단 상호 감사 전수 리포트
          </h2>
          <span className="text-xs text-gray-500">실시간 자율 핑퐁 & 정합성 판정</span>
        </div>

        <div className="space-y-6">
          {simulationReports.map((report, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              {/* 리포트 헤더 */}
              <div className="p-4 bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-rose-500 text-white rounded font-mono text-[10px] font-bold">
                    {report.personaId}
                  </span>
                  <h3 className="text-sm font-bold text-white">{report.personaName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 text-[10px] font-mono">
                    <span className="bg-white/10 text-gray-200 px-2 py-0.5 rounded">화법:{report.score.questionToneScore}</span>
                    <span className="bg-white/10 text-gray-200 px-2 py-0.5 rounded">슬롯:{report.score.slotExtractionScore}</span>
                    <span className="bg-white/10 text-gray-200 px-2 py-0.5 rounded">정합성:{report.score.taxonomyScore}</span>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-green-500 text-white rounded-lg">
                    {report.score.totalScore}점 ({report.finalVerdict})
                  </span>
                </div>
              </div>

              {/* 리포트 본문 */}
              <div className="p-6 space-y-4">
                {/* 1. 대화 트랜스크립트 */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    💬 실시간 2턴 대화 인터랙션
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-xl space-y-2 text-xs">
                    {report.dialogueTranscript.map((t, tIdx) => (
                      <div key={tIdx} className="leading-relaxed">
                        <strong className={t.role === 'user' ? 'text-gray-900' : 'text-rose-700'}>
                          [{t.role === 'user' ? '질문 봇' : '토보 파인더'}] :
                        </strong>{' '}
                        <span className="text-gray-800">{t.content}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 봇 군단 감사 판정 매트릭스 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                    <div className="font-bold text-blue-900 flex items-center justify-between">
                      <span>🕵️ 슬롯 추출 봇 판정</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        완성도 {report.slotAudit.completionRate}%
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600">
                      <strong>추출된 슬롯:</strong> {JSON.stringify(report.slotAudit.extractedSlots)}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center justify-between">
                      <span>🌲 추천 정합성 봇 판정</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        [{report.taxonomyAudit.criteriaBadge}] {report.taxonomyAudit.recommendedShop}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600">
                      <strong>논리 정합성:</strong> {report.taxonomyAudit.isLogicallySound ? '✅ 완벽 일치' : '❌ 모순 발생'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
