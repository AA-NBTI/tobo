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
    // camelCase (AI chat) 또는 snake_case (BookingPanel) 모두 수용
    const customerName = body.customer_name || body.customerName
    const customerPhone = body.customer_phone || body.customerPhone
    const reservationTime = body.reservation_time || body.reservationTime
    const partySize = body.party_size || body.partySize || 1
    const notes = body.notes
    const businessId = body.business_id || body.businessId || null
    const serviceId = body.service_id || body.serviceId || null
    const userId = body.user_id || body.userId || null
    const botId = body.bot_id || body.botId || null

    if (!customerName || !reservationTime) {
      return NextResponse.json({ error: '이름과 예약 시간은 필수입니다' }, { status: 400 })
    }

    const supabase = await createClient()

    const insertData: any = {
      customer_name: customerName,
      customer_phone: customerPhone || null,
      reservation_time: new Date(reservationTime).toISOString(),
      party_size: partySize,
      status: 'pending',
      notes: notes || null,
      user_id: userId,
      bot_id: botId,
    }

    // Phase 3: business_id, service_id 컬럼이 있으면 추가
    if (businessId) insertData.business_id = businessId
    if (serviceId) insertData.service_id = serviceId

    const { data: newReservation, error } = await supabase
      .from('reservations')
      .insert(insertData)
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

