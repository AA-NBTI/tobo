import { NextResponse } from 'next/server'
import { generateEnforcedAIContent } from '@/utils/ai-core'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { content, count = 3 } = await req.json()
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const apiKey = process.env.PIXABAY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Pixabay API key not configured' }, { status: 500 })
    }

    const prompt = `당신은 포스트의 흐름을 분석하여 적절한 위치에 시각 자료를 배치하는 전문 에디터입니다.
다음 마크다운 형식의 본문을 읽고, 글의 흐름을 파악하여 정확히 **${count}곳**의 사진 들어갈 위치를 골라주세요.
해당 위치에 반드시 '[IMAGE: 픽사베이 검색어]' 형식으로 플레이스홀더를 삽입하세요.
(검색어는 픽사베이(Pixabay)에서 이미지 검색이 잘 되도록 반드시 **단순한 영단어 조합(영어)**으로 작성하세요. 
예: '[IMAGE: tonkatsu]', '[IMAGE: osaka night view]', '[IMAGE: business meeting]')

[필수 지침]
1. 원본 텍스트의 내용을 임의로 수정, 삭제, 요약하지 마세요. 원본 그대로 유지하되 중간에 플레이스홀더만 추가해야 합니다.
2. 문단과 문단 사이, 혹은 소제목(##) 바로 아래 등 문맥이 전환되거나 강조가 필요한 곳에 배치하세요.
3. 플레이스홀더는 반드시 새로운 줄(엔터)에 단독으로 작성하세요.
4. 마크다운 코드블록으로 감싸지 말고 순수 텍스트만 출력하세요.
5. 정확히 ${count}개의 플레이스홀더를 삽입하세요.

[블로그 본문]
${content}
`

    const modifiedContentWithPlaceholders = await generateEnforcedAIContent(prompt, 'gemma-4-31b-it')
    
    // Clean up potential markdown blocks
    let cleanText = modifiedContentWithPlaceholders.trim()
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(markdown)?\n/, '').replace(/\n```$/, '')
    }

    // Parse placeholders
    const regex = /\[IMAGE:\s*(.+?)\]/g
    const matches = [...cleanText.matchAll(regex)]

    let finalContent = cleanText

    if (matches.length > 0) {
      // Fetch all images concurrently
      const fetchPromises = matches.map(async (match) => {
        const fullMatch = match[0]
        const keyword = match[1].trim()
        
        try {
          const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=20&lang=en`
          const res = await fetch(url)
          const data = await res.json()
          
          if (data.hits && data.hits.length > 0) {
            // Pick a random image instead of always the first one
            const randomIndex = Math.floor(Math.random() * data.hits.length)
            const imgUrl = data.hits[randomIndex].webformatURL
            
            // 이미지 다운로드
            const imgRes = await fetch(imgUrl)
            const imgBuffer = await imgRes.arrayBuffer()
            
            // Supabase 스토리지에 업로드
            const filename = `pixabay-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
            const { error: uploadError } = await supabaseAdmin.storage
              .from('post_images')
              .upload(filename, imgBuffer, {
                contentType: imgRes.headers.get('content-type') || 'image/jpeg',
                cacheControl: '3600',
                upsert: false
              })

            if (uploadError) {
              console.error('Failed to upload pixabay image to Supabase:', uploadError)
              return { fullMatch, keyword, imgUrl: null }
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('post_images')
              .getPublicUrl(filename)

            return { fullMatch, keyword, imgUrl: publicUrl }
          }
        } catch (e) {
          console.error('Pixabay fetch error for keyword:', keyword, e)
        }
        return { fullMatch, keyword, imgUrl: null }
      })

      const results = await Promise.all(fetchPromises)

      // Replace placeholders with markdown images
      results.forEach(({ fullMatch, keyword, imgUrl }) => {
        if (imgUrl) {
          finalContent = finalContent.replace(fullMatch, `\n![${keyword}](${imgUrl})\n`)
        } else {
          // If no image found, just remove the placeholder
          finalContent = finalContent.replace(fullMatch, '')
        }
      })
    }

    return NextResponse.json({ content: finalContent })
  } catch (error: any) {
    console.error('Error in ai-image-inject API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
