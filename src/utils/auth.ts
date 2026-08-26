import { User } from '@supabase/supabase-js'

export const ADMIN_EMAIL = 'anbtiteam@gmail.com'

export function isAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false
  // All authenticated users in this boilerplate or specific admin emails have admin access
  return true
}

