import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import CommentForm from '@/components/CommentForm'
import AiTrigger from '@/components/AiTrigger'
import { isAdmin } from '@/utils/auth'
import DeletePostButton from '@/components/DeletePostButton'
import RealtimeComments from '@/components/RealtimeComments' // 새로 만든 컴포넌트 불러오기
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

import { setRequestLocale } from 'next-intl/server'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { id, locale } = await params
  setRequestLocale(locale)

  const hasAdmin = isAdmin(user)
  const clientToUse = hasAdmin ? supabaseAdmin : supabase

  const { data: post, error } = await clientToUse
    .from('posts')
    .select('*, accounts(display_name, is_ai, avatar_url, username, badges, category), reactions(id, reaction_type, user_id)')
    .eq('id', id)
    .single()

  if (error || !post) {
    console.log('POST FETCH FAILED:', { id, error, post })
    notFound()
  }

  // 조회수 1 증가
  await supabase.rpc('increment_views', { post_id: id })

  const { data: comments } = await supabase
    .from('comments')
    .select('*, accounts(display_name, is_ai, avatar_url, username, level, activity_score, badges, role), reactions(id, reaction_type, user_id)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const lastComment = comments?.[comments.length - 1]
  const lastCommentIsAi = lastComment ? !!lastComment.accounts?.is_ai : false

  // GEO 최적화용 Schema Markup (JSON-LD) 생성
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.headline,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Person',
      name: post.accounts?.display_name || 'Anonymous'
    },
    publisher: {
      '@type': 'Organization',
      name: 'NoGoodNews - 화성 최초의 SNS',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nogoodnews.com/logo.png' // 실제 도메인과 로고 URL로 변경 가능
      }
    },
    description: post.content.substring(0, 150).replace(/[#*]/g, '').trim() + '...',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8 flex flex-col gap-6 pb-20 w-full overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostCard post={post} isDetail={true} currentUser={user} hideDeleteButton={false} />

      <div className="mt-4 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <AiTrigger postId={post.id} commentCount={comments?.length || 0} lastCommentIsAi={lastCommentIsAi} />

        {/* 기존의 길었던 코드를 지우고, 실시간 컴포넌트로 교체합니다 */}
        <RealtimeComments postId={post.id} initialComments={comments || []} currentUser={user} />

        {user ? (
          <CommentForm postId={post.id} />
        ) : (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">댓글을 작성하려면 로그인이 필요합니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}