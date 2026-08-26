'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/utils/auth'

export async function toggleUserBan(userId: string, isBanned: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('accounts')
    .update({ is_banned: isBanned })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/admin/users')
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function toggleUserAdmin(userId: string, is_admin: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) throw new Error('Unauthorized')

  const { error: dbError } = await supabase
    .from('accounts')
    .update({ is_admin })
    .eq('id', userId)

  if (dbError) throw dbError

  // Update app_metadata via Supabase Admin API
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { is_admin }
  })
  
  if (authError) {
    console.error('Failed to update app_metadata', authError)
    throw authError
  }

  revalidatePath('/admin/users')
}

export async function changeUserTier(userId: string, tier: 'free' | 'paid') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('accounts')
    .update({ subscription_tier: tier })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/admin/users')
}

export async function changeUserLevel(userId: string, level: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('accounts')
    .update({ level })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/admin/users')
}
