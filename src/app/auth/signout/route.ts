import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  
  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}

// Export GET to handle cases where the user directly visits the URL or client-side navigation converts it to a GET
export async function GET(request: Request) {
  return POST(request)
}
