'use client'

import { useState } from 'react'

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  pending:   { label: '대기중', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  confirmed: { label: '확정',   color: 'bg-green-100 text-green-800',  dot: 'bg-green-500' },
  cancelled: { label: '취소',   color: 'bg-red-100 text-red-800',      dot: 'bg-red-400' },
  completed: { label: '완료',   color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function formatTime(dt: string) {
  const d = new Date(dt)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function ReservationCalendar({ reservations }: { reservations: any[] }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)

  // 이번 달 날짜 배열 생성
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
  ]

  // 날짜별 예약 매핑
  const byDate = reservations.reduce((acc, r) => {
    const d = new Date(r.reservation_time)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {} as Record<string, any[]>)

  function getDateKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }

  const selectedReservations = selectedDate
    ? reservations.filter(r => isSameDay(new Date(r.reservation_time), selectedDate))
    : []

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* 캘린더 */}
      <div className="flex-1 min-w-0">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
          >
            ‹
          </button>
          <h2 className="text-base font-bold text-gray-800">
            {year}년 {month + 1}월
          </h2>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const key = getDateKey(d)
            const dayRes = byDate[key] || []
            const isToday = isSameDay(d, today)
            const isSelected = selectedDate ? isSameDay(d, selectedDate) : false
            const hasRes = dayRes.length > 0

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1.5 text-sm transition-all
                  ${isSelected ? 'bg-indigo-600 text-white shadow-md' : isToday ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                <span className="font-medium text-xs">{d.getDate()}</span>
                {hasRes && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                    {dayRes.slice(0, 3).map((r: any, ri: number) => (
                      <span
                        key={ri}
                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : STATUS_LABELS[r.status]?.dot || 'bg-gray-400'}`}
                      />
                    ))}
                    {dayRes.length > 3 && (
                      <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>+{dayRes.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${val.dot}`} />
              {val.label}
            </div>
          ))}
        </div>
      </div>

      {/* 선택된 날짜 예약 목록 */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="bg-gray-50 rounded-xl p-4 h-full min-h-[200px]">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            {selectedDate
              ? `${selectedDate.getMonth()+1}/${selectedDate.getDate()} 예약 (${selectedReservations.length}건)`
              : '날짜를 선택하세요'}
          </h3>

          {selectedReservations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-8">예약 없음</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-96">
              {selectedReservations
                .sort((a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime())
                .map(r => (
                <div key={r.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-800">{formatTime(r.reservation_time)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[r.status]?.color}`}>
                      {STATUS_LABELS[r.status]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{r.customer_name}</p>
                  {r.customer_phone && <p className="text-xs text-gray-400">{r.customer_phone}</p>}
                  <p className="text-xs text-gray-400">{r.party_size}명 {r.notes ? `· ${r.notes}` : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
