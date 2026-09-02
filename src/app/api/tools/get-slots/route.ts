import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { business_id, service_id, target_date } = body // target_date format: 'YYYY-MM-DD'

    if (!business_id || !service_id || !target_date) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    // `time_slots` 테이블에서 해당 일자의 예약 가능한 슬롯 조회
    const { data, error } = await supabase
      .from('time_slots')
      .select('id, slot_time, max_capacity, current_bookings, is_blocked')
      .eq('service_id', service_id)
      .eq('slot_date', target_date)
      .eq('is_blocked', false)
      .order('slot_time', { ascending: true })

    if (error) throw error

    // 예약 가능 여부(is_available)를 동적으로 계산하여 클라이언트에 전달
    const formattedData = data.map(slot => ({
      id: slot.id,
      datetime: `${target_date}T${slot.slot_time}`, // 호환성을 위해 ISO 문자열 조합
      is_available: slot.current_bookings < slot.max_capacity
    }))

    return NextResponse.json({ success: true, data: formattedData })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
