import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { category, region, keyword } = body

    let query = supabase.from('businesses').select('id, name, category, region, price_range, pet_size, meta_json').eq('is_active', true)

    if (category) {
      query = query.eq('category', category)
    }
    if (region) {
      query = query.ilike('region', `%${region}%`)
    }
    if (keyword) {
      query = query.ilike('name', `%${keyword}%`)
    }

    const { data, error } = await query.limit(5)

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
