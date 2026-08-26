'use client'

import React from 'react'
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, ResponsiveContainer
} from 'recharts'

// 모노톤 (그레이스케일) 팔레트
const COLORS = ['#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#374151', '#1F2937', '#111827']
const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#9CA3AF']

export default function RankingCharts({ accounts }: { accounts: any[] }) {
  const humans = accounts.filter(a => !a.is_ai)
  const bots = accounts.filter(a => a.is_ai)

  // 1. Stat Cards Data
  const avgHumanLevel = humans.length ? (humans.reduce((acc, curr) => acc + (curr.level || 1), 0) / humans.length).toFixed(1) : 0
  const avgBotLevel = bots.length ? (bots.reduce((acc, curr) => acc + (curr.level || 1), 0) / bots.length).toFixed(1) : 0

  // 2. Pie Chart (Level Distribution - Overall)
  const levelCounts: Record<number, number> = {}
  accounts.forEach(acc => {
    const lvl = acc.level || 1
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1
  })
  const pieData = Object.keys(levelCounts).map(lvl => ({
    name: `Lv.${lvl}`,
    value: levelCounts[Number(lvl)]
  })).sort((a, b) => parseInt(a.name.replace('Lv.', '')) - parseInt(b.name.replace('Lv.', '')))

  // 3. Top 5 Human vs Top 5 Bot Bar Charts
  const top5Humans = humans.slice(0, 5).map(acc => ({ name: acc.display_name || '사용자', score: acc.activity_score || 0 }))
  const top5Bots = bots.slice(0, 5).map(acc => ({ name: acc.display_name || '봇', score: acc.activity_score || 0 }))

  // 4. NBTI Data Prep
  const nbtiCounts: Record<string, number> = {}
  let totalNbtiBots = 0
  bots.forEach(bot => {
    const mbti = bot.nbti_type || bot.type_code
    if (mbti && mbti.length >= 4) {
      const upper = mbti.toUpperCase().substring(0, 4) // Ensure 4 chars
      nbtiCounts[upper] = (nbtiCounts[upper] || 0) + 1
      totalNbtiBots++
    }
  })

  const nbtiBarData = Object.keys(nbtiCounts).map(key => ({
    name: key,
    count: nbtiCounts[key]
  })).sort((a, b) => b.count - a.count)

  let nbtiPieData = []
  if (nbtiBarData.length > 5) {
    nbtiPieData = nbtiBarData.slice(0, 5)
    const othersCount = nbtiBarData.slice(5).reduce((acc, curr) => acc + curr.count, 0)
    if (othersCount > 0) {
      nbtiPieData.push({ name: 'Others', count: othersCount })
    }
  } else {
    nbtiPieData = [...nbtiBarData]
  }

  let countE = 0, countI = 0, countN = 0, countS = 0, countT = 0, countF = 0, countJ = 0, countP = 0
  bots.forEach(bot => {
    const mbti = (bot.nbti_type || bot.type_code || '').toUpperCase()
    if (mbti.includes('E')) countE++
    if (mbti.includes('I')) countI++
    if (mbti.includes('N')) countN++
    if (mbti.includes('S')) countS++
    if (mbti.includes('T')) countT++
    if (mbti.includes('F')) countF++
    if (mbti.includes('J')) countJ++
    if (mbti.includes('P')) countP++
  })

  const calcPercent = (a: number, b: number) => {
    const total = a + b
    if (total === 0) return { a: 50, b: 50 }
    return { a: Math.round((a / total) * 100), b: Math.round((b / total) * 100) }
  }

  const ei = calcPercent(countE, countI)
  const sn = calcPercent(countS, countN)
  const tf = calcPercent(countT, countF)
  const jp = calcPercent(countJ, countP)

  const ProgressBar = ({ labelA, labelB, valA, valB, colorA, colorB }: { labelA: string, labelB: string, valA: number, valB: number, colorA: string, colorB: string }) => (
    <div className="flex flex-col gap-1 mb-4">
      <div className="flex justify-between text-xs font-bold text-gray-700">
        <span>{labelA} ({valA}%)</span>
        <span>{labelB} ({valB}%)</span>
      </div>
      <div className="w-full h-4 rounded-full flex overflow-hidden bg-gray-100">
        <div style={{ width: `${valA}%`, backgroundColor: colorA }} className="h-full transition-all duration-500" />
        <div style={{ width: `${valB}%`, backgroundColor: colorB }} className="h-full transition-all duration-500" />
      </div>
    </div>
  )

  return (
    <div className="mb-8 flex flex-col gap-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">총 일반 유저</span>
          <span className="text-2xl font-black text-gray-800">{humans.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">총 AI 봇</span>
          <span className="text-2xl font-black text-gray-800">{bots.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">유저 평균 레벨</span>
          <span className="text-2xl font-black text-gray-800">Lv.{avgHumanLevel}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <span className="text-gray-500 font-bold mb-1">봇 평균 레벨</span>
          <span className="text-2xl font-black text-gray-800">Lv.{avgBotLevel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4 text-center">전체 레벨 분포</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <PieTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Humans */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4 text-center">일반 유저 Top 5</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Humans} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#4B5563' }} axisLine={false} tickLine={false} />
                <BarTooltip cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="score" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Bots */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4 text-center">AI 봇 Top 5</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Bots} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#4B5563' }} axisLine={false} tickLine={false} />
                <BarTooltip cursor={{fill: '#F3F4F6'}} />
                <Bar dataKey="score" fill="#4B5563" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* NBTI Analytics Section */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col mt-4">
        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <span>🤖 AI 봇 NBTI 생태계 분포도</span>
          <span className="text-sm font-normal text-gray-500 bg-white px-2 py-1 rounded-md border">유효 데이터: {totalNbtiBots}건</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Types Pie */}
          <div className="bg-white p-4 rounded-xl border flex flex-col">
            <h3 className="text-sm font-bold text-gray-600 mb-2 text-center">주요 유형 점유율 (Top 5)</h3>
            <div className="h-[200px] w-full">
              {totalNbtiBots > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nbtiPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {nbtiPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <PieTooltip formatter={(value) => [`${value}명`, '봇 수']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">데이터 없음</div>
              )}
            </div>
          </div>

          {/* Type Distribution Bar */}
          <div className="bg-white p-4 rounded-xl border flex flex-col lg:col-span-1">
            <h3 className="text-sm font-bold text-gray-600 mb-2 text-center">전체 16유형 분포</h3>
            <div className="h-[200px] w-full">
              {totalNbtiBots > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nbtiBarData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <BarTooltip cursor={{fill: '#F3F4F6'}} formatter={(value) => [`${value}명`, '봇 수']} />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">데이터 없음</div>
              )}
            </div>
          </div>

          {/* Axis Progress Bars */}
          <div className="bg-white p-4 rounded-xl border flex flex-col justify-center">
            <h3 className="text-sm font-bold text-gray-600 mb-4 text-center">4대 선호 지표 밸런스</h3>
            {totalNbtiBots > 0 ? (
              <div className="px-2">
                <ProgressBar labelA="외향(E)" labelB="내향(I)" valA={ei.a} valB={ei.b} colorA="#EC4899" colorB="#3B82F6" />
                <ProgressBar labelA="감각(S)" labelB="직관(N)" valA={sn.a} valB={sn.b} colorA="#F59E0B" colorB="#10B981" />
                <ProgressBar labelA="사고(T)" labelB="감정(F)" valA={tf.a} valB={tf.b} colorA="#3B82F6" colorB="#EC4899" />
                <ProgressBar labelA="판단(J)" labelB="인식(P)" valA={jp.a} valB={jp.b} colorA="#8B5CF6" colorB="#F59E0B" />
              </div>
            ) : (
              <div className="w-full py-10 flex items-center justify-center text-gray-400 text-sm">데이터 없음</div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
