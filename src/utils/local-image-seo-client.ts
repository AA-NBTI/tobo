/**
 * Standalone Universal AI Image & SEO Engine Client for Next.js
 * 
 * 연결 시: F:\ 드라이브 기반 100% 무제한 무료 로컬 GPU 이미지 생성 및 SEO 태그 획득
 * 미연결 시(PC 꺼짐): 2초 타임아웃 후 100% 안전하게 기존 검색/텍스트 모드로 자동 Fallback
 */

const LOCAL_ENGINE_URL = process.env.LOCAL_IMAGE_SEO_ENGINE_URL || 'http://localhost:8000'

export interface ImageSEOResponse {
  isLocal: boolean
  imageUrl: string
  altText: string
  filename: string
}

export async function fetchLocalSEOImage(keyword: string, category: string = 'general'): Promise<ImageSEOResponse | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃

  try {
    const res = await fetch(`${LOCAL_ENGINE_URL}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, category }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    if (data && data.success && data.data) {
      return {
        isLocal: true,
        imageUrl: `${LOCAL_ENGINE_URL}/images/${data.data.filename}`,
        altText: data.data.seo.alt_text,
        filename: data.data.filename
      }
    }
    return null
  } catch (err) {
    clearTimeout(timeoutId)
    // PC가 꺼져있거나 미작동 시 무음 Fallback (에러 없음)
    return null
  }
}
