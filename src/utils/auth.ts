import { User } from '@supabase/supabase-js'

export const ADMIN_EMAIL = 'anbtiteam@gmail.com'

export function isAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false
  if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true
  return user.app_metadata?.is_admin === true
}
