import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// 예약 목록 조회 및 신규 예약 생성 API
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    let query = supabase.from('reservations').select('*, accounts!reservations_bot_id_fkey(display_name)').order('reservation_time', { ascending: true })

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: reservations, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reservations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, botId, customerName, customerPhone, reservationTime, partySize, notes } = body

    if (!customerName || !reservationTime) {
      return NextResponse.json({ error: 'Customer name and reservation time are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: newReservation, error } = await supabase
      .from('reservations')
      .insert({
        user_id: userId || null,
        bot_id: botId || null,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        reservation_time: new Date(reservationTime).toISOString(),
        party_size: partySize || 1,
        status: 'confirmed',
        notes: notes || '직접 등록 예약'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, reservation: newReservation })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
