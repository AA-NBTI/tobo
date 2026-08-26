import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import UnifiedBlogEditor from '@/components/admin/UnifiedBlogEditor'

export default async function EditPostPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const supabase = await createClient()
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { id, locale } = await params

  setRequestLocale(locale);
  if (!user) {
    redirect('/login')
  }

  const { data: post } = await supabaseAdmin.from('posts').select('*').eq('id', id).single()

  if (!post) {
    notFound()
  }

  const hasAdmin = isAdmin(user)
  if (post.author_id !== user.id && !hasAdmin) {
    redirect(`/posts/${id}`)
  }

  // Fetch bots for the editor
  const { data: activeBots } = await supabaseAdmin
    .from('accounts')
    .select('id, display_name, persona_prompt')
    .eq('is_ai', true)
    .eq('status', 'active')
    .order('display_name');

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 mt-4 sm:mt-8">
        <UnifiedBlogEditor 
          bots={activeBots || []} 
          mode="edit" 
          initialData={post} 
        />
      </div>
    </main>
  )
}
