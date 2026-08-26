import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getReservations, getReservationStats } from './actions'
import ReservationsClient from './ReservationsClient'

export const dynamic = 'force-dynamic'

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) redirect('/')

  const [reservations, stats] = await Promise.all([
    getReservations(),
    getReservationStats(),
  ])

  return (
    <div className="w-full max-w-5xl mx-auto p-4 py-8 pb-24">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📅 예약 관리</h1>
        <p className="text-gray-500 text-sm mt-1">AI 채팅으로 접수된 예약을 확인하고 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-xs text-yellow-600 mt-1">대기중</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-700">{stats.confirmed}</div>
          <div className="text-xs text-green-600 mt-1">확정됨</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="text-2xl font-bold text-indigo-700">{stats.today}</div>
          <div className="text-xs text-indigo-600 mt-1">오늘 예약</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">총 예약</div>
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <ReservationsClient initialData={reservations} />
      </div>
    </div>
  )
}
