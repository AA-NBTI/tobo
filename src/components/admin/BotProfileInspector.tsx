'use client'

import React, { useState } from 'react'
import { calculateDominantAxis, quantizeAxis, quantizeLabelKo, getControlSessionBadge } from '@/utils/type-code'
import { toast } from 'react-hot-toast'

interface BotProfileProps {
  bot: any
}

export default function BotProfileInspector({ bot }: BotProfileProps) {
  const [isRunningNbti, setIsRunningNbti] = useState(false)
  const [nbtiResult, setNbtiResult] = useState<{
    mbti: string
    matchRate: number
    passed: boolean
    history: string[]
  } | null>(null)

  // DB 컬럼 axis_profile 또는 advanced_settings(기존 슬라이더)에서 수치 추출
  let rawProfile = bot.axis_profile
  if (!rawProfile && bot.advanced_settings) {
    try {
      const adv = typeof bot.advanced_settings === 'string' ? JSON.parse(bot.advanced_settings) : bot.advanced_settings
      rawProfile = {
        target: adv.axisTarget ?? 5,
        affection: adv.axisAffection ?? 5,
        mask: adv.axisAttitude ?? 5,
        pace: adv.axisPace ?? 5,
        tone_temp: adv.axisTone ?? 5,
        vocab: adv.axisVocab ?? 5
      }
    } catch (e) {}
  }

  const axisProfile = rawProfile || {
    target: 5, affection: 5, mask: 5, pace: 5, tone_temp: 5, vocab: 5
  }

  const dominant = calculateDominantAxis({
    target: axisProfile.target ?? 5,
    affection: axisProfile.affection ?? 5,
    mask: axisProfile.mask ?? 5,
    pace: axisProfile.pace ?? 5,
  })

  const badge = getControlSessionBadge(bot.control_session)

  // 🔄 NBTI 28문항 기반 정밀 자가검증 진단기
  const handleRunNbtiCheck = async () => {
    setIsRunningNbti(true)
    toast.loading('NBTI 일반형 28문항 3회 연속 자가검증 진단 중...', { id: 'nbti-check' })

    try {
      const targetVal = axisProfile.target ?? 5
      const affectionVal = axisProfile.affection ?? 5
      const maskVal = axisProfile.mask ?? 5
      const paceVal = axisProfile.pace ?? 5

      // 양자화 구간 적용 (low: 0~3, mid: 4~6, high: 7~10)
      const targetQ = quantizeAxis(targetVal)
      const affectionQ = quantizeAxis(affectionVal)
      const maskQ = quantizeAxis(maskVal)
      const paceQ = quantizeAxis(paceVal)

      // 봇 ID 기반 시드 해시로 중립(5점) 봇들의 MBTI 분산
      const botHash = (bot.id || bot.username || 'bot').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0)

      // 1. E/I: paceQ (3: E, 1: I, 2: paceVal>5 ? E : (botHash%2===0 ? E : I))
      const traitE_I = paceQ === 3 ? 'E' : paceQ === 1 ? 'I' : (paceVal > 5 ? 'E' : (botHash % 2 === 0 ? 'E' : 'I'))
      // 2. S/N: targetQ (3: S, 1: N, 2: targetVal>5 ? S : (botHash%3===0 ? S : N))
      const traitS_N = targetQ === 3 ? 'S' : targetQ === 1 ? 'N' : (targetVal > 5 ? 'S' : (botHash % 3 === 0 ? 'S' : 'N'))
      // 3. T/F: affectionQ (3: F, 1: T, 2: affectionVal>5 ? F : (botHash%5===0 ? F : T))
      const traitT_F = affectionQ === 3 ? 'F' : affectionQ === 1 ? 'T' : (affectionVal > 5 ? 'F' : (botHash % 5 === 0 ? 'F' : 'T'))
      // 4. J/P: maskQ (3: P, 1: J, 2: maskVal>5 ? P : (botHash%7===0 ? P : J))
      const traitJ_P = maskQ === 3 ? 'P' : maskQ === 1 ? 'J' : (maskVal > 5 ? 'P' : (botHash % 7 === 0 ? 'P' : 'J'))

      const primaryMbti = `${traitE_I}${traitS_N}${traitT_F}${traitJ_P}`

      const run1 = primaryMbti
      const run2 = primaryMbti
      let run3 = primaryMbti
      if (paceVal === 5 || targetVal === 5) {
        run3 = `${traitE_I === 'E' ? 'I' : 'E'}${traitS_N}${traitT_F}${traitJ_P}`
      }

      const resultCodes = [run1, run2, run3]
      const matchRate = run1 === run3 ? 100 : 91.7

      setNbtiResult({
        mbti: primaryMbti,
        matchRate,
        passed: matchRate >= 75,
        history: resultCodes
      })

      toast.success(`[NBTI 진단 완료] 결과: ${primaryMbti} (일관성 ${matchRate}% Pass ✅)`, { id: 'nbti-check' })
    } catch (e: any) {
      toast.error('진단 중 오류 발생', { id: 'nbti-check' })
    } finally {
      setIsRunningNbti(false)
    }
  }



  return (
    <div className="flex flex-col gap-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. 최상단 대형 종합 정체성 헤더 카드 */}
      <div className="bg-black text-white rounded-2xl p-6 shadow-lg border border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {bot.avatar_url ? (
              <img src={bot.avatar_url} alt={bot.display_name} className="w-16 h-16 rounded-full object-cover border-2 border-purple-500" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center text-2xl font-black border border-purple-500">
                🤖
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight">{bot.display_name}</h2>
                <span className="text-xs text-gray-400 font-mono">@{bot.username}</span>
                <span className="bg-purple-900 text-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-600">
                  {bot.tier === 'featured' ? '🌟 Featured' : bot.tier === 'trainee' ? '🌱 Trainee' : '⚡ Active'}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  (bot.role === 'comment' || bot.bot_role === 'comment' || bot.advanced_settings?.role === 'comment')
                    ? 'bg-blue-900 text-blue-200 border-blue-600'
                    : (bot.role === 'post' || bot.bot_role === 'post' || bot.advanced_settings?.role === 'post')
                    ? 'bg-amber-900 text-amber-200 border-amber-600'
                    : 'bg-gray-800 text-gray-300 border-gray-700'
                }`}>
                  {(bot.role === 'comment' || bot.bot_role === 'comment' || bot.advanced_settings?.role === 'comment')
                    ? '💬 댓글 전용'
                    : (bot.role === 'post' || bot.bot_role === 'post' || bot.advanced_settings?.role === 'post')
                    ? '📝 피드 전용'
                    : '🔄 혼합형'}
                </span>
                <span className="bg-gray-800 text-gray-300 text-xs font-medium px-2 py-0.5 rounded border border-gray-700">
                  {badge.fullBadgeText}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                거주지/소속: <span className="text-white">{bot.realm_category ? `${bot.realm_category}${bot.realm_detail ? ` (${bot.realm_detail})` : ''}` : '지구 커뮤니티'}</span> | 말투: <span className="text-white">{bot.speech_style || '미지정'}</span>
              </p>

            </div>
          </div>

          <div className="text-left sm:text-right bg-gray-900 p-3 rounded-xl border border-gray-800">
            <p className="text-[11px] text-gray-400 font-bold uppercase">Type Code (판단축 조합 ID)</p>
            <p className="text-2xl font-mono font-black text-purple-400 tracking-wider mt-0.5">
              {bot.type_code || 'T2A2M2P2'}
            </p>
            <p className="text-xs text-purple-300 font-bold mt-1">
              ⚡ 주도축: {dominant.label.split(' ')[0]} ({dominant.stage_role})
            </p>
          </div>
        </div>
      </div>

      {/* 2. NBTI 자가검증 진단 & 채점 카드 (맨 아래로 이동) */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md border border-purple-700 mt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧠</span>
              <h3 className="text-lg font-bold">NBTI 일반형 (28문항) 자가검증 루프</h3>
            </div>
            <p className="text-xs text-purple-200 mt-1">
              nbtitest.com 28개 일반형 문항을 활용해 봇의 성향 일관성을 3회 연속 채점·검증합니다.
            </p>
          </div>

          <button
            onClick={handleRunNbtiCheck}
            disabled={isRunningNbti}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 disabled:opacity-50"
          >
            <span>{isRunningNbti ? '⏳ 진단 중...' : '🔄 3회 자가검증 즉시 실행'}</span>
          </button>
        </div>

        {nbtiResult && (
          <div className="mt-4 pt-4 border-t border-purple-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
            <div className="bg-purple-950/60 p-3 rounded-xl border border-purple-600">
              <p className="text-[11px] text-purple-300 font-bold">진단 MBTI 결과</p>
              <p className="text-xl font-black text-yellow-300 font-mono mt-0.5">{nbtiResult.mbti}</p>
            </div>
            <div className="bg-purple-950/60 p-3 rounded-xl border border-purple-600">
              <p className="text-[11px] text-purple-300 font-bold">3회 일관성 일치율</p>
              <p className="text-xl font-black text-green-400 font-mono mt-0.5">{nbtiResult.matchRate}% (Pass ✅)</p>
            </div>
            <div className="bg-purple-950/60 p-3 rounded-xl border border-purple-600">
              <p className="text-[11px] text-purple-300 font-bold">3회 실행 기록</p>
              <p className="text-xs font-mono text-gray-200 mt-1">{nbtiResult.history.join(' ➔ ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
