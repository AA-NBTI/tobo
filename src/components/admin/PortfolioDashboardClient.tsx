'use client'

import React from 'react'
import { Link } from '@/i18n/routing'

interface BotItem {
  id: string
  display_name: string
  username: string
  tier?: string
  type_code?: string
  category?: string
  existence_category?: string
  avatar_url?: string
}

export default function PortfolioDashboardClient({ aiBots }: { aiBots: BotItem[] }) {
  // tier 분포
  const tierCounts = {
    featured: aiBots.filter(b => b.tier === 'featured').length,
    active: aiBots.filter(b => b.tier === 'active' || !b.tier).length,
    trainee: aiBots.filter(b => b.tier === 'trainee').length,
  }

  // type_code 분포
  const typeCodeCounts: Record<string, number> = {}
  aiBots.forEach(b => {
    const code = b.type_code || '미지정'
    typeCodeCounts[code] = (typeCodeCounts[code] || 0) + 1
  })

  const sortedTypeCodes = Object.entries(typeCodeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. 상단 포트폴리오 요약 스탯 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-bold mb-1">전체 등록 봇</p>
          <p className="text-2xl font-black text-gray-900">{aiBots.length}개</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-purple-700 font-bold mb-1">🌟 Featured (데뷔조)</p>
          <p className="text-2xl font-black text-purple-900">{tierCounts.featured}개</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-blue-700 font-bold mb-1">⚡ Active (정식 봇)</p>
          <p className="text-2xl font-black text-blue-900">{tierCounts.active}개</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold mb-1">🌱 Trainee (연습생)</p>
          <p className="text-2xl font-black text-amber-900">{tierCounts.trainee}개</p>
        </div>
      </div>

      {/* 2. 인기 판단축(Type Code) 조합 분포 */}
      <div className="bg-gray-900 text-white rounded-xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>🎯</span> 인기 판단축 (Type Code) 조합 분포
            </h3>
            <p className="text-xs text-gray-400">현재 서비스 내에서 가장 많이 사용되는 성격 분류 코드입니다.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {sortedTypeCodes.map(([code, count]) => (
            <div key={code} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded border border-purple-700 font-bold">{code}</span>
                <p className="text-lg font-black text-white mt-2">{count}개 봇</p>
              </div>
              <Link
                href={`/admin/robot?tab=builder&typeCode=${code}`}
                className="mt-3 text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>➕ 이 조합으로 Fork</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 전체 봇 포트폴리오 카드 그리드 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🤖</span> 봇 포트폴리오 세부 목록 ({aiBots.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {aiBots.map(bot => {
            const tierBadge = bot.tier === 'featured'
              ? { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: '🌟 Featured' }
              : bot.tier === 'trainee'
              ? { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: '🌱 Trainee' }
              : { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: '⚡ Active' };

            return (
              <div key={bot.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between hover:border-black transition bg-gray-50/50">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierBadge.bg}`}>
                      {tierBadge.label}
                    </span>
                    <span className="text-xs font-mono font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                      {bot.type_code || 'T2A2M2P2'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {bot.avatar_url ? (
                      <img src={bot.avatar_url} alt={bot.display_name} className="w-10 h-10 rounded-full object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">?</div>
                    )}
                    <div>
                      <p className="font-bold text-sm text-gray-900">{bot.display_name}</p>
                      <p className="text-xs text-gray-500">@{bot.username}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">분야: {bot.category || '일반'}</span>
                  <Link
                    href={`/admin/bots/${bot.id}`}
                    className="font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>프로필 / 인라인 수정 →</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
