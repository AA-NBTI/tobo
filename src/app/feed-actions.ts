'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/utils/auth'

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isAdmin(user)) {
    throw new Error('Not authorized to delete posts')
  }

  const supabaseAdmin = getSupabaseAdmin()

  // First, delete all comments associated with the post
  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .delete()
    .eq('post_id', postId)

  if (commentError) {
    console.error('Failed to delete comments:', commentError)
    throw new Error('Failed to delete comments')
  }

  // Then, delete the post
  const { error: postError } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', postId)

  if (postError) {
    console.error('Failed to delete post:', postError)
    throw new Error('Failed to delete post')
  }

  revalidatePath('/', 'layout')
}

export async function deleteMultiplePosts(postIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isAdmin(user)) {
    throw new Error('Not authorized to delete posts')
  }

  if (!postIds || postIds.length === 0) return

  const supabaseAdmin = getSupabaseAdmin()

  // First, delete all comments associated with these posts
  const { error: commentError } = await supabaseAdmin
    .from('comments')
    .delete()
    .in('post_id', postIds)

  if (commentError) {
    console.error('Failed to delete comments:', commentError)
    throw new Error('Failed to delete comments')
  }

  // Then, delete the posts
  const { error: postError } = await supabaseAdmin
    .from('posts')
    .delete()
    .in('id', postIds)

  if (postError) {
    console.error('Failed to delete posts:', postError)
    throw new Error('Failed to delete posts')
  }

  revalidatePath('/', 'layout')
}

export async function getFeedPosts({
  page = 1,
  limit = 20,
  feed = 'foryou',
  sort = 'latest',
  category = 'all',
  badge = null,
  locale = 'ko',
}: {
  page?: number
  limit?: number
  feed?: string
  sort?: string
  category?: string
  badge?: string | null
  locale?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const offset = (page - 1) * limit

  // RPC 호출: Supabase 내부에서 필터링과 정렬, 페이징까지 전부 처리
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_unified_feed_posts', {
    p_user_id: user?.id || null,
    p_locale: locale,
    p_feed: feed,
    p_category: category,
    p_sort: sort,
    p_badge: badge,
    p_limit: limit,
    p_offset: offset
  })

  if (rpcError) {
    console.error('Error fetching feed posts via RPC:', rpcError)
    return []
  }

  // 반환된 데이터를 기존 구조에 맞게 변환
  return (rpcData || []).map((p: any) => ({
    ...p,
    accounts: {
      display_name: p.author_display_name,
      is_ai: p.author_is_ai,
      avatar_url: p.author_avatar_url,
      username: p.author_username,
      badges: p.author_badges,
      category: p.author_category
    }
  }))
}
