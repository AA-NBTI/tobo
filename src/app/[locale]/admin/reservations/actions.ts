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
  const { error } = await admin
    .from('reservations')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/reservations')
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
