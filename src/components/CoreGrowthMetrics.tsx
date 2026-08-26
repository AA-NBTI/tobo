'use client'

import React from 'react'

type CoreGrowthMetricsProps = {
  metrics: {
    stickiness: string
    powerUsersCount: number
    actionsPerUser: string
    mau: number
    avgSessionDuration?: number
    retentionRate?: number
  }
}

export default function CoreGrowthMetrics({ metrics }: CoreGrowthMetricsProps) {
  // 60초 이상일 경우 분, 초로 변환
  const formatDuration = (seconds: number = 0) => {
    if (seconds < 60) return `${Math.floor(seconds)}초`
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}분 ${secs}초`
  }

  return (
    <div className="mb-10">
      <h3 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
        <span>👑</span> 프리미엄 핵심 성장 지표 <span className="text-sm font-normal text-gray-500 ml-2">(최근 30일 기준)</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-700 font-bold">스티키니스 (Stickiness)</h4>
            <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">DAU / MAU</span>
          </div>
          <div className="text-4xl font-extrabold text-indigo-600 mb-3">{metrics.stickiness}%</div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            한 달 접속자 중 얼마나 많은 유저가 매일 접속하는지 보여줍니다. 통상 20%를 넘으면 대성공으로 평가받습니다.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-700 font-bold">재방문율 (Retention)</h4>
            <span className="bg-orange-50 text-orange-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase border border-orange-200">PostHog Sync</span>
          </div>
          <div className="text-4xl font-extrabold text-orange-500 mb-3">{metrics.retentionRate}%</div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            최근 유입된 방문자 중 지속적으로 다시 방문하는 유저의 비율입니다.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-700 font-bold">평균 체류시간</h4>
            <span className="bg-orange-50 text-orange-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase border border-orange-200">PostHog Sync</span>
          </div>
          <div className="text-4xl font-extrabold text-teal-600 mb-3">{formatDuration(metrics.avgSessionDuration)}</div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            유저가 사이트에 들어와서 나갈 때까지 머무는 평균 시간입니다.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-700 font-bold">광팬 지수 (Power Users)</h4>
            <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">L30 &gt; 15</span>
          </div>
          <div className="text-4xl font-extrabold text-pink-600 mb-3">{metrics.powerUsersCount}명</div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            최근 30일 중 15일 이상 출석한 핵심 유저 수입니다. 커뮤니티의 분위기를 주도하는 상위 1% VIP입니다.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-700 font-bold">평균 인게이지먼트</h4>
            <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">Actions / MAU</span>
          </div>
          <div className="text-4xl font-extrabold text-emerald-600 mb-3">{metrics.actionsPerUser}회</div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            유저 1명당 평균적으로 발생시키는 글, 댓글, 리액션의 합계입니다. 유저 참여도를 판단하는 핵심 기준입니다.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-700 font-bold">월간 활성 유저</h4>
            <span className="bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full font-bold tracking-wide uppercase">MAU</span>
          </div>
          <div className="text-4xl font-extrabold text-amber-600 mb-3">{metrics.mau}명</div>
          <p className="text-sm text-gray-500 leading-relaxed font-medium">
            최근 30일 동안 우리 서비스에 1번이라도 접속한 순수 활성 방문자의 총합입니다.
          </p>
        </div>
      </div>
    </div>
  )
}
