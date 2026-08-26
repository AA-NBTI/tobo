'use client'

import { useState, useTransition } from 'react'

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function BookingPanel({
  business,
  services
}: {
  business: any
  services: any[]
}) {
  const [selectedService, setSelectedService] = useState<any>(services[0] || null)
  const [date, setDate] = useState(getTodayStr())
  const [time, setTime] = useState('10:00')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const timeOptions = Array.from({ length: 20 }, (_, i) => {
    const h = Math.floor(i / 2) + 9
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2,'0')}:${m}`
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('이름을 입력해주세요.'); return }
    setError('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: name,
            customer_phone: phone,
            reservation_time: `${date}T${time}:00`,
            party_size: partySize,
            notes: notes || (selectedService ? selectedService.name : ''),
            business_id: business.id,
            service_id: selectedService?.id,
          })
        })
        if (!res.ok) throw new Error('예약 실패')
        setDone(true)
      } catch (err: any) {
        setError('예약 중 오류가 발생했습니다.')
      }
    })
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-green-100 p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="font-bold text-gray-900 mb-1">예약 완료!</h3>
        <p className="text-sm text-gray-500 mb-1">{business.name}</p>
        <p className="text-sm font-medium text-indigo-700">{date} {time}</p>
        {selectedService && <p className="text-xs text-gray-400 mt-1">{selectedService.name} · {partySize}명</p>}
        <button
          onClick={() => { setDone(false); setName(''); setPhone(''); setNotes('') }}
          className="mt-4 text-xs text-indigo-600 underline"
        >
          추가 예약하기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      {error && <p className="text-red-500 text-xs">{error}</p>}

      {/* 서비스 선택 */}
      {services.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">서비스 선택</label>
          <select
            value={selectedService?.id || ''}
            onChange={e => setSelectedService(services.find(s => s.id === e.target.value) || null)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.price === 0 ? '무료' : `${s.price.toLocaleString()}원`})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 날짜 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">날짜</label>
        <input
          type="date"
          value={date}
          min={getTodayStr()}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* 시간 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">시간</label>
        <select
          value={time}
          onChange={e => setTime(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {timeOptions.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* 이름 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="홍길동"
        />
      </div>

      {/* 연락처 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">연락처</label>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="010-1234-5678"
        />
      </div>

      {/* 인원 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">인원</label>
        <select
          value={partySize}
          onChange={e => setPartySize(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {Array.from({ length: selectedService?.max_party_size || 10 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{n}명</option>
          ))}
        </select>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">요청사항</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="요청사항이 있으면 입력하세요..."
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
      >
        {isPending ? '예약 중...' : '예약하기'}
      </button>
    </form>
  )
}
