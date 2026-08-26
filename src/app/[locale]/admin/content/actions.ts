'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
)

export async function publishSeoBlog(botId: string, formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    throw new Error('Not authorized')
  }

  const content = formData.get('content') as string
  const linkTitle = formData.get('link_title') as string
  const headline = formData.get('headline') as string
  const category = (formData.get('category') as string) || 'all'
  const url = formData.get('url') as string
  const imageFile = formData.get('imageFile') as File | null
  let imageUrl = formData.get('image_url') as string

  if (!content) throw new Error('Content is required')

  // Handle Image Upload if provided
  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const filePath = `${botId}-${Date.now()}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('post_images')
      .upload(filePath, imageFile)

    if (!uploadError) {
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('post_images')
        .getPublicUrl(filePath)
      imageUrl = publicUrl
    } else {
      console.error('Image upload error:', uploadError)
    }
  }

  // Ensure the bot has the 'blogger' badge
  const { data: botAccount } = await supabaseAdmin.from('accounts').select('badges').eq('id', botId).single()
  const currentBadges = botAccount?.badges || []
  if (!currentBadges.includes('blogger')) {
    await supabaseAdmin.from('accounts').update({
      badges: [...currentBadges, 'blogger']
    }).eq('id', botId)
  }

  // Fetch 1 default image from Pixabay based on linkTitle if no image is provided
  if (!imageUrl && linkTitle) {
    try {
      const pixabayKey = process.env.PIXABAY_API_KEY
      if (pixabayKey) {
        const { generateEnforcedAIContent } = await import('@/utils/ai-core')
        const keywordPrompt = `다음 키워드에서 Pixabay 이미지 검색에 가장 적합한 핵심 피사체 명사 1개를 추출한 뒤, 반드시 '순수 영어 단어 1개'로만 번역해서 출력하세요. 아무 설명 없이 순수한 영어 단어 1개만 출력해야 합니다. (예: apple, computer, ocean)\n\n키워드: ${linkTitle}\n\nEnglish Keyword:`
        
        let searchKeyword = linkTitle
        try {
          searchKeyword = await generateEnforcedAIContent(keywordPrompt, 'local')
          searchKeyword = searchKeyword.trim().replace(/['"]/g, '')
        } catch (e) {
          console.error('Failed to extract keyword for blog image:', e)
        }

        const pRes = await fetch(`https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(searchKeyword)}&image_type=photo&per_page=200&lang=en`)
        const pData = await pRes.json()
        if (pData.hits && pData.hits.length > 0) {
          const randomIndex = Math.floor(Math.random() * pData.hits.length)
          imageUrl = pData.hits[randomIndex].webformatURL
        }
      }
    } catch (e) {
      console.error('Pixabay fetch error in publishSeoBlog:', e)
    }
  }

  const { data, error } = await supabaseAdmin.from('posts').insert({
    author_id: botId,
    headline: headline || '무제',
    link_title: linkTitle,
    content: content,
    status: 'pending_publish',
    image_url: imageUrl || null,
    url: url || null
  }).select().single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function fetchMoreReviewPosts(offset: number, limit: number = 50) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) throw new Error('Not authorized')

  const { data: queuePosts } = await supabaseAdmin
    .from('posts')
    .select('*, accounts(display_name, avatar_url, username, post_priority)')
    .in('status', ['rejected', 'pending_review', 'pending_publish', 'published'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return queuePosts || []
}
