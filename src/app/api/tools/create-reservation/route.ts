import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // 현재 로그인된 유저 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { business_id, service_id, slot_id, party_size, special_request } = body

    if (!business_id || !service_id || !slot_id) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    // 1. 슬롯 가능 여부 재확인 및 선점
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .select('current_bookings, max_capacity, is_blocked')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot || slot.is_blocked || slot.current_bookings >= slot.max_capacity) {
      return NextResponse.json({ success: false, error: 'Slot is no longer available' }, { status: 409 })
    }

    // 2. 예약 레코드 생성 (pending 상태)
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: user.id,
        business_id,
        service_id,
        time_slot_id: slot_id,
        party_size: party_size || 1,
        special_request: special_request || '',
        status: 'pending'
      })
      .select()
      .single()

    if (reservationError) throw reservationError

    // 3. 슬롯 상태 업데이트 (예약 인원 증가)
    await supabase.rpc('increment_current_bookings', { slot_id_param: slot_id, count: party_size || 1 })
    // 만약 RPC가 없다면 직접 업데이트:
    // await supabase.from('time_slots').update({ current_bookings: slot.current_bookings + (party_size || 1) }).eq('id', slot_id)

    return NextResponse.json({ success: true, data: reservation })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
