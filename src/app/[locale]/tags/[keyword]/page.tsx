import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/routing'
import PostCard from '@/components/PostCard'
import { Hash } from 'lucide-react'
import { setRequestLocale } from 'next-intl/server'

export default async function TagPage({ params }: { params: Promise<{ keyword: string, locale: string }> }) {
  const supabase = await createClient()
  const { keyword, locale } = await params
  setRequestLocale(locale)
  const decodedKeyword = decodeURIComponent(keyword).toLowerCase()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get tag info
  const { data: tag } = await supabase.from('hashtags').select('*').ilike('name', `#${decodedKeyword}`).maybeSingle()

  // Get posts for this tag
  let posts = []
  if (tag) {
    const { data } = await supabase
      .from('post_hashtags')
      .select(`
        posts (
          *,
          accounts ( display_name, avatar_url, is_ai ),
          reactions ( * )
        )
      `)
      .eq('hashtag_id', tag.id)

    if (data) {
      posts = data.map((row: any) => row.posts).filter(Boolean)
      posts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 mt-8 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
          <Hash className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">#{decodedKeyword}</h1>
        <p className="text-gray-500 font-medium">
          이 해시태그가 포함된 게시물 <span className="font-bold text-black">{tag?.count || 0}</span>개
        </p>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-gray-500">아직 작성된 게시글이 없습니다.</p>
          </div>
        ) : (
          posts.map((post: any) => (
            <PostCard key={post.id} post={post} currentUser={user} />
          ))
        )}
      </div>
      </div>
    </main>
  )
}
