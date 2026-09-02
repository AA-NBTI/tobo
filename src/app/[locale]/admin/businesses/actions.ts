'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// 업체 목록
export async function getBusinesses() {
  const admin = getAdmin()
  const { data, error } = await admin
    .from('businesses')
    .select('*, services(count)')
    .order('created_at', { ascending: false })
  if (error) { console.error(error.message); return [] }
  return data || []
}

// 업체 단건 (서비스 + 리뷰 목록 포함)
export async function getBusiness(id: string) {
  const admin = getAdmin()
  const { data } = await admin
    .from('businesses')
    .select('*, services(*), reviews(*)')
    .eq('id', id)
    .single()
  return data
}

// 점주의 수동 후기 답글 등록/수정
export async function updateReviewReply(reviewId: string, businessId: string, replyText: string) {
  const admin = getAdmin()
  const { error } = await admin
    .from('reviews')
    .update({ ai_reply: replyText })
    .eq('id', reviewId)

  if (error) throw new Error(error.message)
  revalidatePath(`/ko/admin/businesses/${businessId}`)
  revalidatePath(`/shop/${businessId}`)
}

// 업체 생성
export async function createBusiness(form: FormData) {
  const admin = getAdmin()
  const name = form.get('name') as string
  const category = form.get('category') as string
  const description = form.get('description') as string
  const address = form.get('address') as string
  const phone = form.get('phone') as string
  const region = (form.get('region') as string) || (address?.includes('하단') ? '하단동' : '사하구')
  const slug = name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Date.now().toString(36)

  const { error } = await admin.from('businesses').insert({
    name,
    category,
    description,
    address,
    phone,
    region,
    slug,
    is_active: true,
    onboarding_status: 'approved',
    registration_verified: true,
    registration_verified_at: new Date().toISOString()
  })
  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/businesses')
}

// 업체 수정
export async function updateBusiness(id: string, form: FormData) {
  const admin = getAdmin()
  const name = form.get('name') as string
  const category = form.get('category') as string
  const description = form.get('description') as string
  const address = form.get('address') as string
  const phone = form.get('phone') as string
  const region = form.get('region') as string
  const business_registration_number = form.get('business_registration_number') as string
  const is_active_str = form.get('is_active')

  const updatePayload: Record<string, any> = {
    name,
    category,
    description,
    address,
    phone,
  }

  if (region !== null && region !== undefined) updatePayload.region = region
  if (business_registration_number !== null && business_registration_number !== undefined) {
    updatePayload.business_registration_number = business_registration_number
  }
  if (is_active_str !== null && is_active_str !== undefined) {
    updatePayload.is_active = is_active_str === 'true' || is_active_str === 'on'
  }

  const { error } = await admin.from('businesses').update(updatePayload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/businesses')
  revalidatePath(`/ko/admin/businesses/${id}`)
}

// 업체 삭제
export async function deleteBusiness(id: string) {
  const admin = getAdmin()
  const { error } = await admin.from('businesses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/businesses')
}

// 서비스 생성
export async function createService(businessId: string, form: FormData) {
  const admin = getAdmin()
  const { error } = await admin.from('services').insert({
    business_id: businessId,
    name: form.get('name'),
    description: form.get('description'),
    duration_minutes: Number(form.get('duration_minutes') || 60),
    price: Number(form.get('price') || 0),
    max_party_size: Number(form.get('max_party_size') || 1),
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/ko/admin/businesses/${businessId}`)
}

// 서비스 삭제
export async function deleteService(serviceId: string, businessId: string) {
  const admin = getAdmin()
  const { error } = await admin.from('services').delete().eq('id', serviceId)
  if (error) throw new Error(error.message)
  revalidatePath(`/ko/admin/businesses/${businessId}`)
}
