'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

import { cookies } from 'next/headers'
import { ADMIN_EMAIL } from '@/utils/auth'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Login error:', error.message)
    return { error: error.message }
  }

  if (data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    const cookieStore = await cookies()
    cookieStore.set('NEXT_LOCALE', 'ko', { path: '/' })
    revalidatePath('/', 'layout')
    redirect('/ko')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string || email.split('@')[0]

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Signup error:', error.message)
    return { error: error.message }
  }

  if (data.user) {
    const defaultAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.id}`
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
    const randomUsername = `user_${randomHex}`
    
    const { SCORE_REWARDS } = await import('@/utils/scoring')
    
    const { error: insertError } = await supabase.from('accounts').insert({
      id: data.user.id,
      email: data.user.email,
      display_name: displayName,
      username: randomUsername,
      is_ai: false,
      avatar_url: defaultAvatarUrl,
      activity_score: SCORE_REWARDS.REGISTRATION
    })
    if(insertError) {
       console.error('Account creation error:', insertError.message)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function loginWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    console.error('Google login error:', error.message)
    redirect('/login?error=true')
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function sendPasswordResetEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const headersList = await headers()
  
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/settings`,
  })

  if (error) {
    console.error('Password reset error:', error.message)
    return { error: error.message }
  }

  return { success: true }
}
