'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ADMIN_EMAIL } from '@/utils/auth'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: account } = await supabase.from('accounts').select('is_banned').eq('id', user.id).single()
  if (account?.is_banned) {
    throw new Error('Account is banned')
  }

  const headline = formData.get('headline') as string
  const linkTitle = formData.get('link_title') as string
  const url = formData.get('url') as string
  const content = formData.get('content') as string
  const category = (formData.get('category') as string) || 'all'
  const imageFile = formData.get('imageFile') as File | null
  
  const pollQuestion = formData.get('poll_question') as string
  const pollOptionsRaw = formData.get('poll_options') as string
  let pollData = null

  if (pollQuestion && pollOptionsRaw) {
    try {
      const optionsArr = JSON.parse(pollOptionsRaw) as string[]
      const validOptions = optionsArr.filter(opt => opt.trim() !== '')
      if (validOptions.length >= 2) {
        pollData = {
          question: pollQuestion,
          options: validOptions.map((opt, i) => ({ id: `opt_${i}`, text: opt, votes: 0 })),
          voted_users: []
        }
      }
    } catch (e) {}
  }

  let imageUrl = undefined

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(filePath, imageFile)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath)
      imageUrl = publicUrl
    } else {
      console.error('Image upload error:', uploadError)
    }
  }

  const activePersonaId = formData.get('active_persona_id') as string
  let finalAuthorId = user.id
  let clientToUse = supabase
  let controlSessionId: string | null = null

  if (activePersonaId && activePersonaId !== user.id) {
    const { data: botAccount } = await supabaseAdmin.from('accounts').select('id, is_ai').eq('id', activePersonaId).single()
    if (botAccount && botAccount.is_ai) {
      finalAuthorId = activePersonaId
      clientToUse = supabaseAdmin
      controlSessionId = 'piloted'
    }
  }

  const cleanUrl = url && url.trim() !== '' ? url.trim() : null

  // 🚀 Auto-Classification Engine (Heuristic & Progression)
  let postType = 'feed'
  const finalCategory = category === 'all' ? 'free' : category
  if (content && content.length >= 300) {
    const hasParagraphs = content.split('\n\n').length > 1
    const hasMarkdownHeaders = /^#+ /m.test(content)
    if (hasParagraphs || hasMarkdownHeaders) {
      // 분야와 상관없이 기본적으로 블로그로 구성
      postType = 'blog'
      
      // 해당 저자가 동일 카테고리에 작성한 블로그/칼럼 누적 개수 조회
      const { count } = await clientToUse
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', finalAuthorId)
        .eq('category', finalCategory)
        .in('post_type', ['blog', 'column'])

      // 누적 5개가 있으면 이번 글이 6번째이므로 칼럼으로 격상
      if (count !== null && count >= 5) {
        postType = 'column'
      }
    }
  }

  const insertPayload: any = {
    author_id: finalAuthorId,
    headline,
    link_title: linkTitle || null,
    url: cleanUrl,
    content,
    image_url: imageUrl,
    control_session_id: controlSessionId,
    category: finalCategory,
    post_type: postType
  }

  if (pollData) {
    insertPayload.poll_data = pollData
  }

  const { data, error } = await clientToUse.from('posts').insert(insertPayload).select().single()

  if (error) {
    console.error('Error creating post detailed:', error)
    throw new Error(`Failed to create post: ${error.message || error.details || 'Database error'}`)
  }

  const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
  await updateUserScore(supabase, user.id, SCORE_REWARDS.POST)

  // Parse hashtags from headline and content
  const extractHashtags = (text: string) => {
    const regex = /#[\w가-힣-]+/g
    const matches = text.match(regex)
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : []
  }

  const tags = Array.from(new Set([...extractHashtags(headline), ...extractHashtags(content)]))

  if (tags.length > 0) {
    // 1. Upsert hashtags (insert or increment count)
    // Unfortunately Supabase JS doesn't support ON CONFLICT easily with increment without RPC.
    // Let's do it individually or with a custom RPC. For simplicity, let's fetch existing, update count, and insert new.
    for (const tag of tags) {
      const { data: existingTag } = await supabase.from('hashtags').select('id, count').eq('name', tag).single()
      let tagId;
      if (existingTag) {
        tagId = existingTag.id
        await supabase.from('hashtags').update({ count: existingTag.count + 1 }).eq('id', tagId)
      } else {
        const { data: newTag } = await supabase.from('hashtags').insert({ name: tag, count: 1 }).select('id').single()
        if (newTag) tagId = newTag.id
      }
      
      // 2. Link to post
      if (tagId) {
        await supabase.from('post_hashtags').insert({ post_id: data.id, hashtag_id: tagId })
      }
    }
  }

  // 중복 호출을 방지하기 위해 봇 알람(fetch) 로직을 완전히 삭제했습니다.
  // 봇 호출은 화면 단(AiTrigger.tsx)에서 알아서 처리합니다.

  revalidatePath('/')
  redirect(`/posts/${data.id}`)
}

export async function updatePost(postId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
  const { ADMIN_EMAIL } = await import('@/utils/auth')
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  if (!post || (post.author_id !== user.id && !isAdmin)) {
    throw new Error('Permission denied')
  }

  const headline = formData.get('headline') as string
  const linkTitle = formData.get('link_title') as string
  const url = formData.get('url') as string
  const content = formData.get('content') as string
  const imageFile = formData.get('imageFile') as File | null
  const imageUrl = formData.get('image_url') as string

  const updateData: any = { headline, link_title: linkTitle, url, content }

  if (imageUrl) {
    updateData.image_url = imageUrl
  }

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('post_images')
      .upload(filePath, imageFile)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath)
      updateData.image_url = publicUrl
    }
  }

  const isUserAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.app_metadata?.is_admin === true
  const client = isUserAdmin ? supabaseAdmin : supabase
  
  const { error } = await client.from('posts').update(updateData).eq('id', postId)

  if (error) throw new Error('Failed to update post')

  // Re-parse hashtags
  await client.from('post_hashtags').delete().eq('post_id', postId)

  const extractHashtags = (text: string) => {
    const regex = /#[\w가-힣]+/g
    const matches = text.match(regex)
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : []
  }

  const tags = Array.from(new Set([...extractHashtags(headline), ...extractHashtags(content)]))

  if (tags.length > 0) {
    for (const tag of tags) {
      const { data: existingTag } = await supabase.from('hashtags').select('id, count').eq('name', tag).single()
      let tagId;
      if (existingTag) {
        tagId = existingTag.id
        await supabase.from('hashtags').update({ count: existingTag.count + 1 }).eq('id', tagId)
      } else {
        const { data: newTag } = await supabase.from('hashtags').insert({ name: tag, count: 1 }).select('id').single()
        if (newTag) tagId = newTag.id
      }
      
      if (tagId) {
        await supabase.from('post_hashtags').insert({ post_id: postId, hashtag_id: tagId })
      }
    }
  }

  revalidatePath('/')
  revalidatePath(`/posts/${postId}`)
  redirect(`/posts/${postId}`)
}

export async function deletePost(postId: string, locale: string = 'en') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single()
  if (!post) throw new Error('Post not found')

  const isUserAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.app_metadata?.is_admin === true
  if (post.author_id !== user.id && !isUserAdmin) {
    throw new Error('Permission denied')
  }

  const client = isUserAdmin ? supabaseAdmin : supabase
  const { error } = await client.from('posts').delete().eq('id', postId)

  if (error) throw new Error('Failed to delete post')
  
  const returnPath = locale === 'en' ? '/' : `/${locale}`
  revalidatePath(returnPath)
  redirect(returnPath)
}

export async function addComment(formData: FormData, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: account } = await supabase.from('accounts').select('is_banned').eq('id', user.id).single()
  if (account?.is_banned) {
    throw new Error('Account is banned')
  }

  const content = formData.get('content') as string
  const imageUrl = formData.get('image_url') as string | null
  const activePersonaId = formData.get('active_persona_id') as string

  let finalAuthorId = user.id
  let clientToUse = supabase
  if (activePersonaId && activePersonaId !== user.id) {
    const { data: botAccount } = await supabaseAdmin.from('accounts').select('id, is_ai').eq('id', activePersonaId).single()
    if (botAccount && botAccount.is_ai) {
      finalAuthorId = activePersonaId
      clientToUse = supabaseAdmin
    }
  }

  const { error } = await clientToUse.from('comments').insert({
    post_id: postId,
    author_id: finalAuthorId,
    content,
    image_url: imageUrl
  })

  if (error) {
    console.error('Error adding comment:', error)
    throw new Error('Failed to add comment')
  }

  const { updateUserScore, SCORE_REWARDS } = await import('@/utils/scoring')
  await updateUserScore(supabase, user.id, SCORE_REWARDS.FIRST_COMMENT)

  // 🤖 AI 답변 봇 결정 (멘션이 있으면 해당 봇, 없으면 무작위 활성 봇 1개 선택)
  let targetBotId: string | null = null
  const mentionMatch = content.match(/@([a-zA-Z0-9_]+)/)

  if (mentionMatch) {
    const mentionedUsername = mentionMatch[1]
    const { data: mentionedAccount } = await supabaseAdmin
      .from('accounts')
      .select('id, is_ai')
      .eq('username', mentionedUsername)
      .single()
    if (mentionedAccount && mentionedAccount.is_ai) {
      targetBotId = mentionedAccount.id
    }
  } else {
    // 멘션이 없으면 해당 작성자를 제외한 활성 AI 봇 중 1개 무작위 선택
    const { data: randomBots } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('is_ai', true)
      .neq('id', finalAuthorId)
      .neq('status', 'banned')
      .limit(10)

    if (randomBots && randomBots.length > 0) {
      const randomIndex = Math.floor(Math.random() * randomBots.length)
      targetBotId = randomBots[randomIndex].id
    }
  }

  if (targetBotId) {
    const { getLocale } = await import('next-intl/server')
    const locale = await getLocale()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { after } = await import('next/server')
    
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/ai-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            postId, 
            userComment: content,
            botId: targetBotId,
            locale
          })
        })
      } catch (err) {
        console.error('AI Reply Trigger Error:', err)
      }
    })
  }

  revalidatePath('/', 'layout')
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 본인 댓글이거나 관리자인 경우만 삭제 허용
  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  const { ADMIN_EMAIL } = await import('@/utils/auth')
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  if (!comment || (comment.author_id !== user.id && !isAdmin)) {
    throw new Error('Permission denied')
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw new Error('Failed to delete comment')

  revalidatePath('/', 'layout')
}

export async function updateComment(commentId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: comment } = await supabase.from('comments').select('author_id').eq('id', commentId).single()
  if (!comment) throw new Error('Comment not found')

  const isUserAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.app_metadata?.is_admin === true

  if (comment.author_id !== user.id && !isUserAdmin) {
    throw new Error('Permission denied')
  }

  const client = isUserAdmin ? supabaseAdmin : supabase
  const { error } = await client.from('comments').update({ content }).eq('id', commentId)

  if (error) throw new Error('Failed to update comment')
  revalidatePath('/', 'layout')
}

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function translateText(text: string, targetLocale: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing')
  }
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const model = genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" })

  const langName = targetLocale === 'ko' ? 'Korean' : 'English'
  const prompt = `Translate the following text to ${langName}. Preserve any hashtags (#tag) exactly as they are. Output ONLY the translated text without any quotes or explanations.\n\nText:\n${text}`
  
  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Translation error:', error)
    throw new Error('Translation failed')
  }
}

export async function voteOnPoll(postId: string, optionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // RPC 호출을 통해 원자적으로 투표 데이터 업데이트
  const { error } = await supabase.rpc('vote_poll', {
    p_post_id: postId,
    p_option_id: optionId,
    p_user_id: user.id
  })

  if (error) {
    throw new Error(error.message || '투표 처리 중 오류가 발생했습니다.')
  }

  revalidatePath('/', 'layout')
}