'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const displayName = formData.get('displayName') as string
  const username = formData.get('username') as string
  const bio = formData.get('bio') as string
  const avatarFile = formData.get('avatarFile') as File | null
  const coverFile = formData.get('coverFile') as File | null

  let avatarUrl = undefined;
  let coverUrl = undefined;

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) {
      console.error('File upload error:', uploadError)
      throw new Error('Failed to upload file')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  if (avatarFile && avatarFile.size > 0) {
    avatarUrl = await uploadFile(avatarFile)
  }

  if (coverFile && coverFile.size > 0) {
    coverUrl = await uploadFile(coverFile)
  }

  const updateData: any = { 
    display_name: displayName, 
    bio, 
    username: username || null
  }

  // 매칭/데이팅 타겟 고급 필드들 - DB 마이그레이션 불일치 방지를 위해 임시 비활성화
  // if (formData.has('birth_date')) updateData.birth_date = formData.get('birth_date') || null
  // if (formData.has('phone_number')) updateData.phone_number = formData.get('phone_number') || null
  // if (formData.has('contact_email')) updateData.contact_email = formData.get('contact_email') || null
  // if (formData.has('country')) updateData.country = formData.get('country') || null
  // if (formData.has('location')) updateData.location = formData.get('location') || null
  // if (formData.has('gender')) updateData.gender = formData.get('gender') || null
  if (formData.has('nbti_type')) updateData.nbti_type = formData.get('nbti_type') || null
  // if (formData.has('category')) updateData.category = formData.get('category') || null

  // 봇 전용 공개 설정 체크박스가 폼에 포함되어 있는 경우에만 안전하게 반영
  if (formData.has('show_public_card')) {
    updateData.show_public_card = formData.get('show_public_card') === 'on'
  }
  if (formData.has('show_nbti_badge')) {
    updateData.show_nbti_badge = formData.get('show_nbti_badge') === 'on'
  }
  if (formData.has('show_realm_info')) {
    updateData.show_realm_info = formData.get('show_realm_info') === 'on'
  }
  if (formData.has('show_prompt')) {
    updateData.show_prompt = formData.get('show_prompt') === 'on'
  }



  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }
  if (coverUrl) {
    updateData.cover_url = coverUrl
  }

  const { error } = await supabase
    .from('accounts')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    throw new Error('Failed to update profile')
  }

  // Handle site logo
  const { isAdmin } = await import('@/utils/auth')
  const { data: profile } = await supabase.from('accounts').select('is_admin').eq('id', user.id).single()
  const isUserAdmin = profile?.is_admin || isAdmin(user)

  if (isUserAdmin) {
    const { createClient: createRawClient } = await import('@supabase/supabase-js')
    const adminSupabase = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const removeLogo = formData.get('removeLogo') === 'true'
    
    if (removeLogo) {
      await adminSupabase.from('site_settings').update({ logo_url: null }).eq('id', 'global')
    } else {
      const logoFile = formData.get('logoFile') as File | null
      if (logoFile && logoFile.size > 0) {
        const logoUrl = await uploadFile(logoFile)
        const { error: logoError } = await adminSupabase
          .from('site_settings')
          .update({ logo_url: logoUrl })
          .eq('id', 'global')
        
        if (logoError) {
          console.error('Error updating site logo:', logoError)
          await adminSupabase.from('site_settings').insert({ id: 'global', logo_url: logoUrl })
        }
      }
    }
  }

  revalidatePath('/', 'layout')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const newPassword = formData.get('newPassword') as string
  if (!newPassword || newPassword.length < 6) {
    return { error: '비밀번호는 최소 6자 이상이어야 합니다.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    console.error('Error updating password:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateLocaleCookie(locale: string) {
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 31536000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
}


export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { createClient: createRawClient } = await import('@supabase/supabase-js')
  const adminSupabase = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminSupabase.auth.admin.deleteUser(user.id)
  
  if (error) {
    console.error('Error deleting account:', error)
    return { error: error.message }
  }

  await supabase.auth.signOut()
  
  return { success: true }
}
