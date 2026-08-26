import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    
    if (!q) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const apiKey = process.env.PIXABAY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Pixabay API key not configured' }, { status: 500 })
    }

    // Pixabay API URL (lang=ko supports Korean searches)
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(q)}&image_type=photo&per_page=20&lang=ko`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`)
    }
    
    const data = await response.json()

    // Map to a common format
    const results = data.hits.map((hit: any) => ({
      id: hit.id,
      url: hit.webformatURL,
      thumbnail: hit.webformatURL,
      title: hit.tags,
      author: hit.user,
      authorUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`
    }))

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Error in image-search API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
