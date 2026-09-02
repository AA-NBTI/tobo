import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/admin/approve-business
 * Body: { businessId: string }
 * 승인 게이트: pending_review → approved + is_active = true
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json()
    if (!businessId) return NextResponse.json({ error: 'businessId 필요' }, { status: 400 })

    const admin = getAdmin()
    const { data, error } = await admin
      .from('businesses')
      .update({
        onboarding_status: 'approved',
        is_active: true,
        registration_verified: true,
        registration_verified_at: new Date().toISOString(),
      })
      .eq('id', businessId)
      .eq('onboarding_status', 'pending_review') // 이미 approved면 변경 안 됨
      .select('id, name, onboarding_status, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: '대상 업체 없음 또는 이미 승인됨' }, { status: 404 })

    return NextResponse.json({ success: true, business: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/approve-business
 * Body: { businessId: string }
 * 승인 취소: approved → pending_review + is_active = false
 */
export async function DELETE(req: NextRequest) {
  try {
    const { businessId } = await req.json()
    if (!businessId) return NextResponse.json({ error: 'businessId 필요' }, { status: 400 })

    const admin = getAdmin()
    const { data, error } = await admin
      .from('businesses')
      .update({ onboarding_status: 'pending_review', is_active: false })
      .eq('id', businessId)
      .select('id, name, onboarding_status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, business: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
