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

// 업체 단건
export async function getBusiness(id: string) {
  const admin = getAdmin()
  const { data } = await admin
    .from('businesses')
    .select('*, services(*)')
    .eq('id', id)
    .single()
  return data
}

// 업체 생성
export async function createBusiness(form: FormData) {
  const admin = getAdmin()
  const name = form.get('name') as string
  const category = form.get('category') as string
  const description = form.get('description') as string
  const address = form.get('address') as string
  const phone = form.get('phone') as string
  const slug = name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Date.now().toString(36)

  const { error } = await admin.from('businesses').insert({
    name, category, description, address, phone, slug
  })
  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/businesses')
}

// 업체 수정
export async function updateBusiness(id: string, form: FormData) {
  const admin = getAdmin()
  const { error } = await admin.from('businesses').update({
    name: form.get('name'),
    category: form.get('category'),
    description: form.get('description'),
    address: form.get('address'),
    phone: form.get('phone'),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/ko/admin/businesses')
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
