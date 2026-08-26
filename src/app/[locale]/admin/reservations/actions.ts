'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getReservations(status?: string) {
  const admin = getAdmin()
  let query = admin
    .from('reservations')
    .select('*, accounts!reservations_user_id_fkey(display_name, avatar_url)')
    .order('reservation_time', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    console.error('getReservations error:', error.message)
    return []
  }
  return data || []
}

export async function updateReservationStatus(id: string, status: string) {
  const admin = getAdmin()
  
  const updatePayload: any = { status }
  if (status === 'completed') {
    updatePayload.review_requested_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('reservations')
    .update(updatePayload)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/reservations')
}

// AI 자동 리뷰 요청 메시지 생성 및 발송 시뮬레이션
export async function sendAiReviewRequest(reservationId: string) {
  const admin = getAdmin()
  const { data: res } = await admin
    .from('reservations')
    .select('*, businesses(name, slug)')
    .eq('id', reservationId)
    .single()

  if (!res) throw new Error('예약 정보를 찾을 수 없습니다.')

  // AI 리뷰 요청 텍스트 생성
  const bizName = res.businesses?.name || '저희 매장'
  const reviewUrl = `/b/${res.businesses?.slug || ''}`
  const message = `안녕하세요 ${res.customer_name}님! ${bizName}을 이용해 주셔서 진심으로 감사드립니다. 서비스는 만족스러우셨나요? 소중한 후기를 남겨주시면 큰 힘이 됩니다. ⭐ 후기 남기기: ${reviewUrl}`

  // review_requested_at 갱신
  await admin
    .from('reservations')
    .update({ review_requested_at: new Date().toISOString() })
    .eq('id', reservationId)

  revalidatePath('/ko/admin/reservations')
  return { success: true, message }
}

export async function deleteReservation(id: string) {
  const admin = getAdmin()
  const { error } = await admin
    .from('reservations')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/reservations')
}

export async function getReservationStats() {
  const admin = getAdmin()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const [pending, confirmed, todayRes, total] = await Promise.all([
    admin.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
    admin.from('reservations').select('id', { count: 'exact', head: true }).gte('reservation_time', todayStr),
    admin.from('reservations').select('id', { count: 'exact', head: true }),
  ])

  return {
    pending: pending.count ?? 0,
    confirmed: confirmed.count ?? 0,
    today: todayRes.count ?? 0,
    total: total.count ?? 0,
  }
}
